const mongoose = require("mongoose");
const Integration = require("../../models/Integration");

const { interpolate } = require("../templateUtils");

const gmail = require("./gmail");
const slack = require("./slack");
const discord = require("./discord");
const googleSheets = require("./googleSheets");
const notion = require("./notion");
const hubspot = require("./hubspot");
const webhook = require("./webhook");

/*
|--------------------------------------------------------------------------
| CORTEXFLOW ACTION / INTEGRATION SERVICE
|--------------------------------------------------------------------------
|
| This service is responsible for executing every workflow node where:
|
| node.data.kind === "action"
|
| Supported action nodes:
|
| - Send Email
| - Slack Message
| - Discord Message
| - Google Sheets Append
| - Notion Create Page
| - HubSpot Upsert
| - Webhook Call
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| ACTION NODE REGISTRY
|--------------------------------------------------------------------------
|
| Maps the Workflow Builder node key to:
|
| 1. Integration provider
| 2. Executor function
| 3. Whether saved credentials are optional
|
|--------------------------------------------------------------------------
*/

const ACTION_REGISTRY = {
  sendEmail: {
    provider: "gmail",
    run: gmail.send,
    credentialsOptional: false,
  },

  slackMessage: {
    provider: "slack",
    run: slack.send,
    credentialsOptional: false,
  },

  discordMessage: {
    provider: "discord",
    run: discord.send,
    credentialsOptional: false,
  },

  googleSheetsAppend: {
    provider: "googleSheets",
    run: googleSheets.appendRow,
    credentialsOptional: false,
  },

  notionCreatePage: {
    provider: "notion",
    run: notion.createPage,
    credentialsOptional: false,
  },

  hubspotUpsert: {
    provider: "hubspot",
    run: hubspot.upsertContact,
    credentialsOptional: false,
  },

  webhookCall: {
    provider: "webhook",
    run: webhook.call,

    /*
    |--------------------------------------------------------------------------
    | WEBHOOK SPECIAL CASE
    |--------------------------------------------------------------------------
    |
    | A webhook action can work without a saved Integration document because
    | the workflow node itself may contain the complete URL/method/body.
    |
    |--------------------------------------------------------------------------
    */

    credentialsOptional: true,
  },
};

/*
|--------------------------------------------------------------------------
| VALIDATE OWNER ID
|--------------------------------------------------------------------------
*/

const validateOwnerId = (ownerId) => {
  if (!ownerId) {
    throw new Error(
      "Action execution requires an owner ID."
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      ownerId
    )
  ) {
    throw new Error(
      "Invalid workflow owner ID."
    );
  }
};

/*
|--------------------------------------------------------------------------
| RESOLVE INTEGRATION
|--------------------------------------------------------------------------
|
| Looks for the connected Integration belonging to the workflow owner.
|
| If integrationId exists on the node:
|
|     config.integrationId
|
| CortexFlow loads that exact integration.
|
| Otherwise it loads the most recently updated integration for that provider.
|
|--------------------------------------------------------------------------
*/

const resolveIntegration = async ({
  ownerId,
  provider,
  integrationId,
}) => {
  validateOwnerId(ownerId);

  const query = {
    owner: ownerId,
    provider,
  };

  /*
  |--------------------------------------------------------------------------
  | SPECIFIC INTEGRATION
  |--------------------------------------------------------------------------
  */

  if (integrationId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        integrationId
      )
    ) {
      throw new Error(
        `Invalid integration ID for "${provider}".`
      );
    }

    query._id = integrationId;
  }

  const integration =
    await Integration.findOne(query)
      .select("+credentials")
      .sort({
        updatedAt: -1,
      });

  return integration;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE CONFIG
|--------------------------------------------------------------------------
|
| Resolves CortexFlow variables before an integration receives them.
|
| Examples:
|
| {{lead.email}}
| {{lead.name}}
| {{ai.output}}
|
|--------------------------------------------------------------------------
*/

const resolveActionConfig = (
  rawConfig,
  context
) => {
  try {
    return interpolate(
      rawConfig || {},
      context || {}
    );
  } catch (error) {
    throw new Error(
      `Could not resolve action variables: ${error.message}`
    );
  }
};

/*
|--------------------------------------------------------------------------
| VALIDATE ACTION CONFIG
|--------------------------------------------------------------------------
|
| Provides clear errors before calling external APIs.
|
|--------------------------------------------------------------------------
*/

const validateActionConfig = (
  key,
  config
) => {
  switch (key) {
    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    case "sendEmail": {
      if (
        !String(
          config.to || ""
        ).trim()
      ) {
        throw new Error(
          'Send Email requires a "To" address.'
        );
      }

      if (
        !String(
          config.subject || ""
        ).trim()
      ) {
        throw new Error(
          "Send Email requires a subject."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | SLACK
    |--------------------------------------------------------------------------
    */

    case "slackMessage": {
      if (
        !String(
          config.channel || ""
        ).trim()
      ) {
        throw new Error(
          "Slack Message requires a channel."
        );
      }

      if (
        !String(
          config.message || ""
        ).trim()
      ) {
        throw new Error(
          "Slack Message requires message text."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | DISCORD
    |--------------------------------------------------------------------------
    */

    case "discordMessage": {
      if (
        !String(
          config.channel || ""
        ).trim()
      ) {
        throw new Error(
          "Discord Message requires a channel."
        );
      }

      if (
        !String(
          config.message || ""
        ).trim()
      ) {
        throw new Error(
          "Discord Message requires message text."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | GOOGLE SHEETS
    |--------------------------------------------------------------------------
    */

    case "googleSheetsAppend": {
      if (
        !String(
          config.spreadsheetId || ""
        ).trim()
      ) {
        throw new Error(
          "Google Sheets requires a Spreadsheet ID."
        );
      }

      if (
        !String(
          config.sheetName || ""
        ).trim()
      ) {
        throw new Error(
          "Google Sheets requires a sheet name."
        );
      }

      if (
        config.values ===
          undefined ||
        config.values === null ||
        String(
          config.values
        ).trim() === ""
      ) {
        throw new Error(
          "Google Sheets requires row values."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | NOTION
    |--------------------------------------------------------------------------
    */

    case "notionCreatePage": {
      if (
        !String(
          config.parentPageId || ""
        ).trim()
      ) {
        throw new Error(
          "Notion requires a Parent Page ID."
        );
      }

      if (
        !String(
          config.title || ""
        ).trim()
      ) {
        throw new Error(
          "Notion requires a page title."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | HUBSPOT
    |--------------------------------------------------------------------------
    */

    case "hubspotUpsert": {
      if (
        !String(
          config.email || ""
        ).trim()
      ) {
        throw new Error(
          "HubSpot requires a contact email."
        );
      }

      break;
    }

    /*
    |--------------------------------------------------------------------------
    | WEBHOOK
    |--------------------------------------------------------------------------
    */

    case "webhookCall": {
      if (
        !String(
          config.url || ""
        ).trim()
      ) {
        throw new Error(
          "Webhook Call requires a target URL."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | BASIC URL VALIDATION
      |--------------------------------------------------------------------------
      */

      try {
        const parsedUrl =
          new URL(config.url);

        if (
          ![
            "http:",
            "https:",
          ].includes(
            parsedUrl.protocol
          )
        ) {
          throw new Error(
            "Unsupported protocol."
          );
        }
      } catch (error) {
        throw new Error(
          "Webhook Call requires a valid HTTP or HTTPS URL."
        );
      }

      break;
    }

    default:
      break;
  }
};

/*
|--------------------------------------------------------------------------
| MARK INTEGRATION SUCCESS
|--------------------------------------------------------------------------
*/

const markIntegrationSuccess =
  async (integration) => {
    if (!integration) {
      return;
    }

    try {
      await Integration.findByIdAndUpdate(
        integration._id,
        {
          $set: {
            status: "connected",
            lastError: null,
            lastUsedAt:
              new Date(),
          },
        },
        {
          returnDocument:
            "after",
        }
      );
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Integration metadata failure should NOT cause a successful external
      | action to become a failed workflow execution.
      |
      |--------------------------------------------------------------------------
      */

      console.warn(
        `[integration] Could not update success metadata for ${integration.provider}: ${error.message}`
      );
    }
  };

/*
|--------------------------------------------------------------------------
| MARK INTEGRATION ERROR
|--------------------------------------------------------------------------
*/

const markIntegrationError =
  async (
    integration,
    error
  ) => {
    if (!integration) {
      return;
    }

    try {
      await Integration.findByIdAndUpdate(
        integration._id,
        {
          $set: {
            status: "error",

            lastError:
              error?.message ||
              "Unknown integration error",
          },
        },
        {
          returnDocument:
            "after",
        }
      );
    } catch (metadataError) {
      console.warn(
        `[integration] Could not update error metadata for ${integration.provider}: ${metadataError.message}`
      );
    }
  };

/*
|--------------------------------------------------------------------------
| NORMALIZE ACTION RESULT
|--------------------------------------------------------------------------
|
| Makes all integration outputs follow a predictable CortexFlow structure.
|
|--------------------------------------------------------------------------
*/

const normalizeActionResult = (
  key,
  provider,
  result
) => {
  /*
  |--------------------------------------------------------------------------
  | OBJECT RESULT
  |--------------------------------------------------------------------------
  */

  if (
    result &&
    typeof result ===
      "object" &&
    !Array.isArray(result)
  ) {
    return {
      subtype: key,
      provider,
      success: true,

      ...result,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | STRING / NUMBER / BOOLEAN RESULT
  |--------------------------------------------------------------------------
  */

  return {
    subtype: key,
    provider,
    success: true,

    output:
      result ?? null,
  };
};

/*
|--------------------------------------------------------------------------
| EXECUTE ACTION NODE
|--------------------------------------------------------------------------
|
| Entry point called by workflowEngine.js.
|
|--------------------------------------------------------------------------
*/

const executeActionNode =
  async (
    node,
    context,
    options = {}
  ) => {
    /*
    |--------------------------------------------------------------------------
    | NODE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!node) {
      throw new Error(
        "Action node is missing."
      );
    }

    const key =
      node.data?.key;

    if (!key) {
      throw new Error(
        "Action node has no action key."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FIND ACTION
    |--------------------------------------------------------------------------
    */

    const entry =
      ACTION_REGISTRY[key];

    if (!entry) {
      throw new Error(
        `Unsupported action node type: ${key}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | OWNER
    |--------------------------------------------------------------------------
    */

    const ownerId =
      options.ownerId;

    validateOwnerId(
      ownerId
    );

    /*
    |--------------------------------------------------------------------------
    | CONFIG
    |--------------------------------------------------------------------------
    */

    const rawConfig =
      node.data?.config ||
      {};

    const config =
      resolveActionConfig(
        rawConfig,
        context
      );

    /*
    |--------------------------------------------------------------------------
    | VALIDATE NODE CONFIG
    |--------------------------------------------------------------------------
    */

    validateActionConfig(
      key,
      config
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD INTEGRATION
    |--------------------------------------------------------------------------
    */

    let integration = null;

    try {
      integration =
        await resolveIntegration({
          ownerId,

          provider:
            entry.provider,

          integrationId:
            config.integrationId,
        });
    } catch (error) {
      throw new Error(
        `${
          node.data?.label ||
          key
        } failed: ${error.message}`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREDENTIAL REQUIREMENT
    |--------------------------------------------------------------------------
    */

    if (
      !integration &&
      !entry.credentialsOptional
    ) {
      throw new Error(
        `${
          node.data?.label ||
          key
        } failed: No connected "${entry.provider}" integration found. Connect it from the Integrations page first.`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | INTEGRATION STATUS
    |--------------------------------------------------------------------------
    |
    | If the Integration exists but was previously marked as an error, we
    | still allow execution. A successful call will restore it to connected.
    |
    |--------------------------------------------------------------------------
    */

    const credentials =
      integration?.credentials ||
      {};

    /*
    |--------------------------------------------------------------------------
    | EXECUTE EXTERNAL ACTION
    |--------------------------------------------------------------------------
    */

    try {
      const result =
        await entry.run({
          credentials,
          config,
          context:
            context || {},

          integration:
            integration || null,

          ownerId,
        });

      /*
      |--------------------------------------------------------------------------
      | SUCCESS METADATA
      |--------------------------------------------------------------------------
      */

      await markIntegrationSuccess(
        integration
      );

      /*
      |--------------------------------------------------------------------------
      | RETURN NORMALIZED RESULT
      |--------------------------------------------------------------------------
      */

      return normalizeActionResult(
        key,
        entry.provider,
        result
      );
    } catch (error) {
      /*
      |--------------------------------------------------------------------------
      | ERROR METADATA
      |--------------------------------------------------------------------------
      */

      await markIntegrationError(
        integration,
        error
      );

      /*
      |--------------------------------------------------------------------------
      | CLEAN WORKFLOW ERROR
      |--------------------------------------------------------------------------
      */

      throw new Error(
        `${
          node.data?.label ||
          key
        } failed: ${
          error?.message ||
          "Unknown integration error"
        }`
      );
    }
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  ACTION_REGISTRY,

  executeActionNode,

  resolveIntegration,
};