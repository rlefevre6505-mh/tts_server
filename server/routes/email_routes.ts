import { Router } from "express";
import type { Request, Response } from "express";
// import type {} from "../types";
import { Resend } from "resend";
const emailRouter = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// React Email with Resend
emailRouter.post("/support", async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    const data = await resend.emails.send({
      // from: `${process.env.CUSTOM_DOMAIN}`,
      from: `onboarding@resend.dev`,
      to: `${process.env.SUPPORT_EMAIL}`,
      subject: "Tom The Shop Support",
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, error: err });
  }
});

export default emailRouter;
