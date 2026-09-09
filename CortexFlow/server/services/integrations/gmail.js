const nodemailer = require("nodemailer");

/*
|--------------------------------------------------------------------------
| CORTEXFLOW GMAIL INTEGRATION
|--------------------------------------------------------------------------
|
| Sends real emails from the CortexFlow "Send Email" Action Node.
|
| Authentication:
|
| Gmail address + Google App Password
|
| Required credentials:
|
| credentials.user
| credentials.appPassword
|
| Supported node configuration:
|
| to
| subject
| body
| html
| cc
| bcc
| replyTo
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| EMAIL VALIDATION
|--------------------------------------------------------------------------
*/

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmailList = (
  value
) => {
  if (!value) {
    return [];
  }

  /*
  |--------------------------------------------------------------------------
  | ARRAY
  |--------------------------------------------------------------------------
  */

  if (Array.isArray(value)) {
    return value
      .map((email) =>
        String(email).trim()
      )
      .filter(Boolean);
  }

  /*
  |--------------------------------------------------------------------------
  | COMMA-SEPARATED STRING
  |--------------------------------------------------------------------------
  */

  return String(value)
    .split(",")
    .map((email) =>
      email.trim()
    )
    .filter(Boolean);
};

const validateEmailList = (
  emails,
  fieldName
) => {
  for (const email of emails) {
    if (!EMAIL_REGEX.test(email)) {
      throw new Error(
        `Invalid email address in ${fieldName}: ${email}`
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| CREATE TRANSPORTER
|--------------------------------------------------------------------------
*/

const createTransporter = (
  credentials
) => {
  const user = String(
    credentials?.user || ""
  ).trim();

  const appPassword = String(
    credentials?.appPassword || ""
  )
    .replace(/\s+/g, "")
    .trim();

  if (!user) {
    throw new Error(
      "Gmail integration is missing the Gmail address."
    );
  }

  if (!EMAIL_REGEX.test(user)) {
    throw new Error(
      "Gmail integration contains an invalid Gmail address."
    );
  }

  if (!appPassword) {
    throw new Error(
      "Gmail integration is missing the Google App Password."
    );
  }

  return {
    user,

    transporter:
      nodemailer.createTransport({
        service: "gmail",

        auth: {
          user,
          pass: appPassword,
        },
      }),
  };
};

/*
|--------------------------------------------------------------------------
| SEND EMAIL
|--------------------------------------------------------------------------
*/

const send = async ({
  credentials = {},
  config = {},
}) => {
  /*
  |--------------------------------------------------------------------------
  | CREATE GMAIL TRANSPORT
  |--------------------------------------------------------------------------
  */

  const {
    user,
    transporter,
  } = createTransporter(
    credentials
  );

  /*
  |--------------------------------------------------------------------------
  | RECIPIENT
  |--------------------------------------------------------------------------
  */

  const to =
    normalizeEmailList(
      config.to
    );

  if (!to.length) {
    throw new Error(
      'Send Email requires a recipient in the "To" field.'
    );
  }

  validateEmailList(
    to,
    "To"
  );

  /*
  |--------------------------------------------------------------------------
  | CC
  |--------------------------------------------------------------------------
  */

  const cc =
    normalizeEmailList(
      config.cc
    );

  validateEmailList(
    cc,
    "CC"
  );

  /*
  |--------------------------------------------------------------------------
  | BCC
  |--------------------------------------------------------------------------
  */

  const bcc =
    normalizeEmailList(
      config.bcc
    );

  validateEmailList(
    bcc,
    "BCC"
  );

  /*
  |--------------------------------------------------------------------------
  | REPLY-TO
  |--------------------------------------------------------------------------
  */

  const replyTo =
    String(
      config.replyTo || ""
    ).trim();

  if (
    replyTo &&
    !EMAIL_REGEX.test(
      replyTo
    )
  ) {
    throw new Error(
      `Invalid Reply-To email address: ${replyTo}`
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SUBJECT
  |--------------------------------------------------------------------------
  */

  const subject =
    String(
      config.subject ||
        "(no subject)"
    );

  /*
  |--------------------------------------------------------------------------
  | CONTENT
  |--------------------------------------------------------------------------
  */

  const textBody =
    config.body ===
      undefined ||
    config.body === null
      ? ""
      : String(
          config.body
        );

  const htmlBody =
    config.html ===
      undefined ||
    config.html === null ||
    config.html === ""
      ? undefined
      : String(
          config.html
        );

  if (
    !textBody.trim() &&
    !htmlBody
  ) {
    throw new Error(
      "Send Email requires an email body."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIL OPTIONS
  |--------------------------------------------------------------------------
  */

  const mailOptions = {
    from: {
      name:
        String(
          config.fromName ||
            "CortexFlow"
        ).trim(),

      address: user,
    },

    to,

    subject,

    text:
      textBody,

    html:
      htmlBody,
  };

  if (cc.length) {
    mailOptions.cc = cc;
  }

  if (bcc.length) {
    mailOptions.bcc = bcc;
  }

  if (replyTo) {
    mailOptions.replyTo =
      replyTo;
  }

  /*
  |--------------------------------------------------------------------------
  | SEND THROUGH GMAIL
  |--------------------------------------------------------------------------
  */

  const startedAt =
    Date.now();

  let info;

  try {
    info =
      await transporter.sendMail(
        mailOptions
      );
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATION ERRORS
    |--------------------------------------------------------------------------
    */

    if (
      error?.code ===
        "EAUTH" ||
      error?.responseCode ===
        535
    ) {
      throw new Error(
        "Gmail authentication failed. Check the Gmail address and Google App Password."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CONNECTION ERRORS
    |--------------------------------------------------------------------------
    */

    if (
      [
        "ECONNECTION",
        "ETIMEDOUT",
        "ESOCKET",
        "ECONNRESET",
      ].includes(
        error?.code
      )
    ) {
      throw new Error(
        `Could not connect to Gmail SMTP: ${error.message}`
      );
    }

    throw new Error(
      `Gmail send failed: ${
        error?.message ||
        "Unknown Gmail error"
      }`
    );
  }

  const duration =
    Date.now() -
    startedAt;

  /*
  |--------------------------------------------------------------------------
  | NORMALIZED RESULT
  |--------------------------------------------------------------------------
  */

  return {
    provider: "gmail",

    success: true,

    messageId:
      info.messageId ||
      null,

    accepted:
      info.accepted ||
      [],

    rejected:
      info.rejected ||
      [],

    pending:
      info.pending ||
      [],

    response:
      info.response ||
      null,

    envelope:
      info.envelope ||
      null,

    duration,

    to,

    subject,
  };
};

module.exports = {
  send,
};