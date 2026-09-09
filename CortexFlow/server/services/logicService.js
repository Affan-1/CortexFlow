const {
  getByPath,
  interpolate,
} = require("./templateUtils");

/*
|--------------------------------------------------------------------------
| CORTEXFLOW LOGIC SERVICE
|--------------------------------------------------------------------------
|
| Handles:
|
| condition
| filter
| delay
| merge
|
| Logic nodes control how workflow execution continues.
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

// Maximum inline delay = 5 minutes.
//
// Longer delays should later use scheduled jobs instead of blocking
// a BullMQ worker for hours or days.

const MAX_DELAY_MS =
  5 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isEmptyValue = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return true;
  }

  if (
    typeof value === "string"
  ) {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

/*
|--------------------------------------------------------------------------
| NUMBER CHECK
|--------------------------------------------------------------------------
*/

const toNumber = (value) => {
  const number =
    Number(value);

  return Number.isNaN(number)
    ? null
    : number;
};

/*
|--------------------------------------------------------------------------
| OPERATOR NORMALIZATION
|--------------------------------------------------------------------------
|
| Frontend values include:
|
| equals
| not equals
| contains
| does not contain
| greater than
| greater than or equal
| less than
| less than or equal
| exists
| is empty
|
| Older workflows might contain camelCase values.
|
|--------------------------------------------------------------------------
*/

const normalizeOperator = (
  operator
) => {
  const normalized =
    normalizeText(operator)
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");

  const aliases = {
    equals: "equals",

    "not equals":
      "notEquals",

    notequals:
      "notEquals",

    contains:
      "contains",

    "does not contain":
      "notContains",

    "not contains":
      "notContains",

    notcontains:
      "notContains",

    "greater than":
      "greaterThan",

    greaterthan:
      "greaterThan",

    "greater than or equal":
      "greaterThanOrEqual",

    "greater than or equal to":
      "greaterThanOrEqual",

    greaterthanorequal:
      "greaterThanOrEqual",

    "less than":
      "lessThan",

    lessthan:
      "lessThan",

    "less than or equal":
      "lessThanOrEqual",

    "less than or equal to":
      "lessThanOrEqual",

    lessthanorequal:
      "lessThanOrEqual",

    exists:
      "exists",

    "is empty":
      "isEmpty",

    isempty:
      "isEmpty",

    "is not empty":
      "isNotEmpty",

    isnotempty:
      "isNotEmpty",
  };

  return (
    aliases[normalized] ||
    "equals"
  );
};

/*
|--------------------------------------------------------------------------
| OPERATORS
|--------------------------------------------------------------------------
*/

const OPERATORS = {
  equals: (actual, expected) => {
    /*
    |--------------------------------------------------------------------------
    | NUMBER COMPARISON WHEN POSSIBLE
    |--------------------------------------------------------------------------
    */

    const actualNumber =
      toNumber(actual);

    const expectedNumber =
      toNumber(expected);

    if (
      actualNumber !== null &&
      expectedNumber !== null &&
      String(actual).trim() !== "" &&
      String(expected).trim() !== ""
    ) {
      return (
        actualNumber ===
        expectedNumber
      );
    }

    return (
      normalizeText(actual) ===
      normalizeText(expected)
    );
  },

  notEquals: (
    actual,
    expected
  ) =>
    !OPERATORS.equals(
      actual,
      expected
    ),

  contains: (
    actual,
    expected
  ) => {
    if (Array.isArray(actual)) {
      return actual.some(
        (item) =>
          normalizeText(item) ===
          normalizeText(
            expected
          )
      );
    }

    return normalizeText(
      actual
    ).includes(
      normalizeText(expected)
    );
  },

  notContains: (
    actual,
    expected
  ) =>
    !OPERATORS.contains(
      actual,
      expected
    ),

  greaterThan: (
    actual,
    expected
  ) => {
    const a =
      toNumber(actual);

    const b =
      toNumber(expected);

    if (
      a === null ||
      b === null
    ) {
      return false;
    }

    return a > b;
  },

  greaterThanOrEqual: (
    actual,
    expected
  ) => {
    const a =
      toNumber(actual);

    const b =
      toNumber(expected);

    if (
      a === null ||
      b === null
    ) {
      return false;
    }

    return a >= b;
  },

  lessThan: (
    actual,
    expected
  ) => {
    const a =
      toNumber(actual);

    const b =
      toNumber(expected);

    if (
      a === null ||
      b === null
    ) {
      return false;
    }

    return a < b;
  },

  lessThanOrEqual: (
    actual,
    expected
  ) => {
    const a =
      toNumber(actual);

    const b =
      toNumber(expected);

    if (
      a === null ||
      b === null
    ) {
      return false;
    }

    return a <= b;
  },

  exists: (actual) =>
    !isEmptyValue(actual),

  isEmpty: (actual) =>
    isEmptyValue(actual),

  isNotEmpty: (actual) =>
    !isEmptyValue(actual),
};

/*
|--------------------------------------------------------------------------
| RESOLVE WORKFLOW VALUE
|--------------------------------------------------------------------------
|
| Supports both:
|
| lead.score
|
| and:
|
| {{lead.score}}
|
|--------------------------------------------------------------------------
*/

const resolveValue = (
  value,
  context
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return value;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | TEMPLATE VALUE
  |--------------------------------------------------------------------------
  */

  if (
    trimmed.includes("{{")
  ) {
    return interpolate(
      trimmed,
      context
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CONTEXT PATH
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | ai.response
  | trigger.payload.email
  | nodes.node_1.output
  |
  |--------------------------------------------------------------------------
  */

  const contextValue =
    getByPath(
      context,
      trimmed
    );

  if (
    contextValue !==
    undefined
  ) {
    return contextValue;
  }

  /*
  |--------------------------------------------------------------------------
  | NORMAL STRING
  |--------------------------------------------------------------------------
  */

  return trimmed;
};

/*
|--------------------------------------------------------------------------
| CONDITION NODE
|--------------------------------------------------------------------------
*/

const runCondition = ({
  config,
  context,
}) => {
  const field =
    config.field || "";

  if (!field.trim()) {
    throw new Error(
      "Condition node requires a field."
    );
  }

  const operator =
    normalizeOperator(
      config.operator
    );

  const actualValue =
    resolveValue(
      field,
      context
    );

  const compareValue =
    interpolate(
      String(
        config.value ?? ""
      ),
      context
    );

  const operatorFunction =
    OPERATORS[operator];

  if (!operatorFunction) {
    throw new Error(
      `Unsupported condition operator: ${config.operator}`
    );
  }

  const result =
    operatorFunction(
      actualValue,
      compareValue
    );

  const branch =
    result
      ? "yes"
      : "no";

  return {
    subtype:
      "condition",

    field,

    operator,

    actualValue,

    compareValue,

    result,

    branch,

    output: {
      result,
      branch,
      actualValue,
      compareValue,
    },
  };
};

/*
|--------------------------------------------------------------------------
| FILTER NODE
|--------------------------------------------------------------------------
|
| Filter decides whether workflow execution should continue.
|
| Supported examples:
|
| true
| false
|
| {{lead.email}}
|
| lead.email
|
|--------------------------------------------------------------------------
*/

const runFilter = ({
  config,
  context,
}) => {
  const expression =
    String(
      config.expression || ""
    ).trim();

  if (!expression) {
    throw new Error(
      "Filter node requires an expression."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | BOOLEAN EXPRESSIONS
  |--------------------------------------------------------------------------
  */

  if (
    normalizeText(
      expression
    ) === "true"
  ) {
    return {
      subtype: "filter",
      expression,
      passed: true,
      branch: "yes",

      output: {
        passed: true,
      },
    };
  }

  if (
    normalizeText(
      expression
    ) === "false"
  ) {
    return {
      subtype: "filter",
      expression,
      passed: false,
      branch: "no",

      output: {
        passed: false,
      },
    };
  }

  /*
  |--------------------------------------------------------------------------
  | RESOLVE WORKFLOW DATA
  |--------------------------------------------------------------------------
  */

  const resolved =
    resolveValue(
      expression,
      context
    );

  const passed =
    !isEmptyValue(
      resolved
    ) &&
    normalizeText(
      resolved
    ) !== "false";

  return {
    subtype:
      "filter",

    expression,

    resolved,

    passed,

    branch:
      passed
        ? "yes"
        : "no",

    output: {
      passed,
      resolved,
    },
  };
};

/*
|--------------------------------------------------------------------------
| DELAY UNIT TO MILLISECONDS
|--------------------------------------------------------------------------
*/

const getDelayMultiplier = (
  unit
) => {
  switch (
    normalizeText(unit)
  ) {
    case "second":
    case "seconds":
      return 1000;

    case "minute":
    case "minutes":
      return 60 * 1000;

    case "hour":
    case "hours":
      return (
        60 *
        60 *
        1000
      );

    default:
      return 1000;
  }
};

/*
|--------------------------------------------------------------------------
| DELAY NODE
|--------------------------------------------------------------------------
|
| Frontend currently provides:
|
| duration
| unit
|
| Example:
|
| duration: 10
| unit: Seconds
|
|--------------------------------------------------------------------------
*/

const runDelay = async ({
  config,
}) => {
  /*
  |--------------------------------------------------------------------------
  | CURRENT FRONTEND FORMAT
  |--------------------------------------------------------------------------
  */

  let requestedMs = 0;

  if (
    config.duration !==
    undefined
  ) {
    const duration =
      Number(
        config.duration
      );

    if (
      !Number.isNaN(
        duration
      ) &&
      duration > 0
    ) {
      requestedMs =
        duration *
        getDelayMultiplier(
          config.unit
        );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LEGACY SUPPORT
  |--------------------------------------------------------------------------
  */

  if (
    requestedMs === 0 &&
    Number(
      config.seconds
    ) > 0
  ) {
    requestedMs =
      Number(
        config.seconds
      ) * 1000;
  }

  if (
    requestedMs === 0 &&
    Number(config.ms) > 0
  ) {
    requestedMs =
      Number(
        config.ms
      );
  }

  const waitMs =
    Math.min(
      Math.max(
        requestedMs,
        0
      ),
      MAX_DELAY_MS
    );

  if (waitMs > 0) {
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          waitMs
        )
    );
  }

  return {
    subtype:
      "delay",

    requestedMs,

    waitedMs:
      waitMs,

    capped:
      requestedMs >
      MAX_DELAY_MS,

    output: {
      waitedMs:
        waitMs,

      capped:
        requestedMs >
        MAX_DELAY_MS,
    },
  };
};

/*
|--------------------------------------------------------------------------
| MERGE NODE
|--------------------------------------------------------------------------
*/

const runMerge = ({
  context,
}) => {
  return {
    subtype: "merge",

    message:
      "Branches merged successfully.",

    output:
      context,
  };
};

/*
|--------------------------------------------------------------------------
| LOGIC NODE HANDLERS
|--------------------------------------------------------------------------
*/

const LOGIC_NODE_HANDLERS = {
  condition:
    runCondition,

  filter:
    runFilter,

  delay:
    runDelay,

  merge:
    runMerge,
};

/*
|--------------------------------------------------------------------------
| EXECUTE LOGIC NODE
|--------------------------------------------------------------------------
*/

const executeLogicNode =
  async (
    node,
    context
  ) => {
    if (!node) {
      throw new Error(
        "Logic node is missing."
      );
    }

    const key =
      node.data?.key ||
      "condition";

    const config =
      node.data?.config ||
      {};

    const handler =
      LOGIC_NODE_HANDLERS[
        key
      ];

    if (!handler) {
      throw new Error(
        `Unsupported logic node type: ${key}`
      );
    }

    try {
      return await handler({
        config,
        context:
          context || {},
      });
    } catch (error) {
      throw new Error(
        `${
          node.data?.label ||
          "Logic node"
        } failed: ${
          error.message ||
          "Unknown logic error"
        }`
      );
    }
  };

module.exports = {
  executeLogicNode,
  LOGIC_NODE_HANDLERS,
};