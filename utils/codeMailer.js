const nodemailer = require("nodemailer");

const mailer = async (userName, userEmail, code) => {
  let transporter = nodemailer.createTransport({
    host: process.env.host,
    port: process.env.port,
    secure: true,
    auth: {
      user: process.env.user,
      pass: process.env.pass,
    },
  });

  await transporter.sendMail({
    from: `"Connectify" <${process.env.connectify}>`,
    to: `${userEmail}`,
    subject: "Verification Code",
    text: `${code}`,
    html: `
    <section style="font-family: Arial, Helvetica, sans-serif">
    <h2>Confirm your email to join Connectify</h2>
    <p>Hi, <b>${userName}</b>!</p>
    <p>Below is your verification code to gain access to our community.</p>
    <p>
      <span
        style="
          padding: 8px 16px;
          background-color: rgb(21, 41, 41);
          font-weight: bold;
          font-size: large;
          border-radius: 5px;
          border: 0 solid rgb(21, 41, 41);
          color: white;
        "
        >${code}</span
      >
    </p>
    <p><small>code will expire in 15 minutes.</small></p>
    <p>
      If you didn't apply to join <b>Connectify</b>, please, ignore this
      message.
    </p>
    <b>Thanks.</b>
  </section>
    `,
  });

  console.log("message sent");
};

module.exports = mailer;
