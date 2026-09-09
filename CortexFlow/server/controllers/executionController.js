const asyncHandler = require("express-async-handler");

const Execution = require("../models/Execution");
const Workflow = require("../models/Workflow");

const {
  runWorkflowFromTrigger,
} = require("../services/triggerService");

/*
|--------------------------------------------------------------------------
| GET ALL EXECUTIONS
|--------------------------------------------------------------------------
|
| GET /api/executions
|
|--------------------------------------------------------------------------
*/

const getExecutions = asyncHandler(
  async (req, res) => {
    const {
      workflowId,
      status,
      limit = 100,
    } = req.query;

    /*
     * IMPORTANT:
     * Execution model uses "owner", not "user".
     */

    const query = {
      owner: req.user._id,
    };

    if (workflowId) {
      query.workflow = workflowId;
    }

    if (status) {
      query.status = status;
    }

    const executions =
      await Execution.find(query)
        .populate(
          "workflow",
          "name status trigger"
        )
        .sort({
          createdAt: -1,
        })
        .limit(
          Math.min(
            Number(limit) || 100,
            200
          )
        )
        .lean();

    res.status(200).json(executions);
  }
);


/*
|--------------------------------------------------------------------------
| GET SINGLE EXECUTION
|--------------------------------------------------------------------------
|
| GET /api/executions/:id
|
|--------------------------------------------------------------------------
*/

const getExecutionById = asyncHandler(
  async (req, res) => {
    const execution =
      await Execution.findOne({
        _id: req.params.id,

        /*
         * Execution belongs to owner.
         */

        owner: req.user._id,
      })
        .populate(
          "workflow",
          "name status trigger"
        )
        .lean();

    if (!execution) {
      res.status(404);

      throw new Error(
        "Execution not found"
      );
    }

    res.status(200).json(execution);
  }
);


/*
|--------------------------------------------------------------------------
| RUN WORKFLOW MANUALLY
|--------------------------------------------------------------------------
|
| POST /api/executions/run/:workflowId
|
|--------------------------------------------------------------------------
*/

const runWorkflow = asyncHandler(
  async (req, res) => {
    const workflow =
      await Workflow.findOne({
        _id: req.params.workflowId,
        owner: req.user._id,
      });

    if (!workflow) {
      res.status(404);

      throw new Error(
        "Workflow not found"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | STATUS CHECK
    |--------------------------------------------------------------------------
    |
    | Draft workflows can be test-run.
    | Active workflows can also be run manually.
    |
    */

    if (
      workflow.status !== "Active" &&
      workflow.status !== "Draft"
    ) {
      res.status(400);

      throw new Error(
        "Workflow must be Active or Draft before running"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | INPUT
    |--------------------------------------------------------------------------
    */

    const input =
      req.body?.input ||
      req.body?.data ||
      {};


    /*
    |--------------------------------------------------------------------------
    | QUEUE WORKFLOW
    |--------------------------------------------------------------------------
    */

    const execution =
      await runWorkflowFromTrigger({
        workflow,

        triggerType: "manual",

        input,
      });


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    res.status(202).json({
      message:
        "Workflow execution queued successfully",

      execution,
    });
  }
);


/*
|--------------------------------------------------------------------------
| RETRY EXECUTION
|--------------------------------------------------------------------------
|
| POST /api/executions/:id/retry
|
|--------------------------------------------------------------------------
*/

const retryExecution = asyncHandler(
  async (req, res) => {
    const originalExecution =
      await Execution.findOne({
        _id: req.params.id,

        owner: req.user._id,
      }).populate("workflow");

    if (!originalExecution) {
      res.status(404);

      throw new Error(
        "Execution not found"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | WORKFLOW STILL EXISTS
    |--------------------------------------------------------------------------
    */

    if (!originalExecution.workflow) {
      res.status(404);

      throw new Error(
        "The workflow for this execution no longer exists"
      );
    }


    const workflow =
      originalExecution.workflow;


    /*
    |--------------------------------------------------------------------------
    | SECURITY CHECK
    |--------------------------------------------------------------------------
    */

    if (
      String(workflow.owner) !==
      String(req.user._id)
    ) {
      res.status(403);

      throw new Error(
        "Not authorized"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | ONLY FAILED/CANCELLED EXECUTIONS
    |--------------------------------------------------------------------------
    */

    if (
      originalExecution.status !==
        "failed" &&
      originalExecution.status !==
        "cancelled"
    ) {
      res.status(400);

      throw new Error(
        "Only failed or cancelled executions can be retried"
      );
    }


    /*
    |--------------------------------------------------------------------------
    | REUSE ORIGINAL INPUT
    |--------------------------------------------------------------------------
    */

    const input =
      originalExecution.input ||
      {};


    /*
    |--------------------------------------------------------------------------
    | CREATE A NEW EXECUTION
    |--------------------------------------------------------------------------
    */

    const execution =
      await runWorkflowFromTrigger({
        workflow,

        triggerType: "manual",

        input,
      });


    res.status(202).json({
      message:
        "Execution retry queued successfully",

      execution,
    });
  }
);


/*
|--------------------------------------------------------------------------
| DELETE EXECUTION
|--------------------------------------------------------------------------
|
| DELETE /api/executions/:id
|
|--------------------------------------------------------------------------
*/

const deleteExecution = asyncHandler(
  async (req, res) => {
    const execution =
      await Execution.findOne({
        _id: req.params.id,

        owner: req.user._id,
      });

    if (!execution) {
      res.status(404);

      throw new Error(
        "Execution not found"
      );
    }


    await execution.deleteOne();


    res.status(200).json({
      message:
        "Execution deleted successfully",

      id: req.params.id,
    });
  }
);


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  getExecutions,
  getExecutionById,
  runWorkflow,
  retryExecution,
  deleteExecution,
};