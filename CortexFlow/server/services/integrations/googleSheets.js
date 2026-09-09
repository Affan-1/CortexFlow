const { google } = require("googleapis");

/*
|--------------------------------------------------------------------------
| CORTEXFLOW GOOGLE SHEETS INTEGRATION
|--------------------------------------------------------------------------
|
| Appends workflow data to a Google Sheet using a Google Service Account.
|
| Required integration credentials:
|
|   credentials.serviceAccountEmail
|   credentials.privateKey
|
| Required action config:
|
|   config.spreadsheetId
|   config.values
|
| Optional:
|
|   config.sheetName
|   config.range
|
|--------------------------------------------------------------------------
*/

const GOOGLE_SHEETS_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets";

/*
|--------------------------------------------------------------------------
| NORMALIZE PRIVATE KEY
|--------------------------------------------------------------------------
*/

const normalizePrivateKey = (privateKey) => {
  if (!privateKey) {
    return "";
  }

  return String(privateKey)
    .trim()
    .replace(/\\n/g, "\n");
};

/*
|--------------------------------------------------------------------------
| NORMALIZE VALUES
|--------------------------------------------------------------------------
|
| The workflow UI may save values as:
|
|   ["John", "john@email.com", "New Lead"]
|
| or as a JSON string:
|
|   '["John", "john@email.com", "New Lead"]'
|
|--------------------------------------------------------------------------
*/

const normalizeValues = (values) => {
  if (Array.isArray(values)) {
    return values;
  }

  if (typeof values === "string") {
    const trimmed = values.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (!Array.isArray(parsed)) {
        throw new Error(
          "Google Sheets row values must be a JSON array."
        );
      }

      return parsed;
    } catch (error) {
      if (
        error.message ===
        "Google Sheets row values must be a JSON array."
      ) {
        throw error;
      }

      throw new Error(
        'Google Sheets row values must be valid JSON, for example: ["John", "john@example.com", "New Lead"]'
      );
    }
  }

  return [];
};

/*
|--------------------------------------------------------------------------
| NORMALIZE SHEET RANGE
|--------------------------------------------------------------------------
*/

const buildRange = (config = {}) => {
  if (config.range) {
    return String(config.range).trim();
  }

  const sheetName =
    String(
      config.sheetName || "Sheet1"
    ).trim() || "Sheet1";

  /*
  |--------------------------------------------------------------------------
  | Escape apostrophes in Google Sheet names.
  |--------------------------------------------------------------------------
  */

  const safeSheetName =
    sheetName.replace(/'/g, "''");

  return `'${safeSheetName}'!A:Z`;
};

/*
|--------------------------------------------------------------------------
| CREATE GOOGLE AUTH CLIENT
|--------------------------------------------------------------------------
*/

const createAuthClient = (credentials = {}) => {
  const serviceAccountEmail =
    String(
      credentials.serviceAccountEmail || ""
    ).trim();

  const privateKey =
    normalizePrivateKey(
      credentials.privateKey
    );

  if (!serviceAccountEmail) {
    throw new Error(
      "Google Sheets integration is missing the service account email."
    );
  }

  if (!privateKey) {
    throw new Error(
      "Google Sheets integration is missing the service account private key."
    );
  }

  return new google.auth.JWT({
    email: serviceAccountEmail,

    key: privateKey,

    scopes: [
      GOOGLE_SHEETS_SCOPE,
    ],
  });
};

/*
|--------------------------------------------------------------------------
| APPEND ROW
|--------------------------------------------------------------------------
*/

const appendRow = async ({
  credentials = {},
  config = {},
}) => {
  const startedAt = Date.now();

  /*
  |--------------------------------------------------------------------------
  | SPREADSHEET
  |--------------------------------------------------------------------------
  */

  const spreadsheetId =
    String(
      config.spreadsheetId ||
        credentials.spreadsheetId ||
        ""
    ).trim();

  if (!spreadsheetId) {
    throw new Error(
      "Google Sheets node is missing a spreadsheetId."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | VALUES
  |--------------------------------------------------------------------------
  */

  const values =
    normalizeValues(
      config.values
    );

  if (!values.length) {
    throw new Error(
      "Google Sheets node is missing row values."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RANGE
  |--------------------------------------------------------------------------
  */

  const range =
    buildRange(config);

  /*
  |--------------------------------------------------------------------------
  | AUTHENTICATION
  |--------------------------------------------------------------------------
  */

  const auth =
    createAuthClient(
      credentials
    );

  const sheets =
    google.sheets({
      version: "v4",
      auth,
    });

  /*
  |--------------------------------------------------------------------------
  | APPEND TO GOOGLE SHEET
  |--------------------------------------------------------------------------
  */

  try {
    const response =
      await sheets.spreadsheets.values.append({
        spreadsheetId,

        range,

        valueInputOption:
          "USER_ENTERED",

        insertDataOption:
          "INSERT_ROWS",

        requestBody: {
          values: [
            values,
          ],
        },
      });

    const updates =
      response.data?.updates || {};

    return {
      provider:
        "googleSheets",

      success: true,

      spreadsheetId,

      range,

      updatedRange:
        updates.updatedRange ||
        null,

      updatedRows:
        updates.updatedRows ||
        0,

      updatedColumns:
        updates.updatedColumns ||
        0,

      updatedCells:
        updates.updatedCells ||
        0,

      duration:
        Date.now() -
        startedAt,
    };
  } catch (error) {
    const status =
      error?.response?.status ||
      error?.code;

    const googleMessage =
      error?.response?.data?.error
        ?.message ||
      error?.message ||
      "Unknown Google Sheets error";

    /*
    |--------------------------------------------------------------------------
    | COMMON GOOGLE SHEETS ERRORS
    |--------------------------------------------------------------------------
    */

    if (
      status === 401 ||
      status === 403
    ) {
      throw new Error(
        `Google Sheets authentication/access failed: ${googleMessage}. Make sure the spreadsheet is shared with the CortexFlow service account email.`
      );
    }

    if (status === 404) {
      throw new Error(
        `Google Sheet was not found: ${googleMessage}. Check the Spreadsheet ID and make sure the service account has access.`
      );
    }

    throw new Error(
      `Google Sheets append failed: ${googleMessage}`
    );
  }
};

module.exports = {
  appendRow,
};