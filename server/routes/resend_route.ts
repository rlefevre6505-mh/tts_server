import { Router } from "express";
import type { Request, Response } from "express";
// import type {} from "../types";
import { Resend } from "resend";
const router = Router();

// React Email with Resend
const resend = new Resend(process.env.RESEND_API_KEY);
//
router.post("/email", async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
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
