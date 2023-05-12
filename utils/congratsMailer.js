const nodemailer = require("nodemailer");

const congratsMailer = async (userName, userEmail) => {
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
    subject: "Registration Successful!",
    text: `You have successfully become a member.`,
    html: `
    <section style="font-family: Arial, Helvetica, sans-serif">
      <h2>Congratulations, <b>${userName}</b>! 🎉🎉</h2>
      <p>You are now a verified member of Connectify.</p>
      <p>
        Feel free to connect with others in your network, search for jobs, post
        valuable contents, and spread the good message about our community.
      </p>
      <p>We hope you will find here as your second home.</p>
      <p>
        <b>Share ideas. Connect.</b>
      </p>
    </section>
    `,
  });

  console.log("message sent");
};

module.exports = congratsMailer;
