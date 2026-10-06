const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
admin.initializeApp();
const SMTP_HOST=defineSecret("SMTP_HOST"),SMTP_PORT=defineSecret("SMTP_PORT"),SMTP_USER=defineSecret("SMTP_USER"),SMTP_PASS=defineSecret("SMTP_PASS"),MAIL_FROM=defineSecret("MAIL_FROM");
exports.sendRegistrationConfirmation=onDocumentCreated({document:"registrations/{registrationId}",region:"europe-west1",secrets:[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,MAIL_FROM]},async event=>{
 const d=event.data?.data(); if(!d?.email){logger.warn("Registration has no email address.");return;}
 const safe=v=>String(v||"").replace(/[<>&"]/g,"");
 const transporter=nodemailer.createTransport({host:SMTP_HOST.value(),port:Number(SMTP_PORT.value()||587),secure:Number(SMTP_PORT.value())===465,auth:{user:SMTP_USER.value(),pass:SMTP_PASS.value()}});
 await transporter.sendMail({from:MAIL_FROM.value(),to:d.email,subject:"4REAL GLOBAL IT SOLUTION - Registration Successful",text:`Hello ${safe(d.firstName)} ${safe(d.surname)},\n\nYour registration with 4REAL GLOBAL IT SOLUTION was successful.\n\nRegistration Number: ${safe(d.registrationNumber)}\nProgram: ${safe(d.program)}\nCourse/Stack: ${safe(d.previousStack)}\nInstitution: ${safe(d.institution)}\n\nWhatsApp Group: https://chat.whatsapp.com/D77oIhaLk0EKWH7ESaAJaw\n\nRegards,\n4REAL GLOBAL IT SOLUTION`,html:`<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:25px"><h2 style="color:#0a5c2e">Registration Successful</h2><p>Hello <strong>${safe(d.firstName)} ${safe(d.surname)}</strong>,</p><p>Your registration with <strong>4REAL GLOBAL IT SOLUTION</strong> was successful.</p><div style="background:#f2f8f4;padding:18px;border-left:4px solid #75d32d"><p><strong>Registration Number:</strong> ${safe(d.registrationNumber)}</p><p><strong>Program:</strong> ${safe(d.program)}</p><p><strong>Course/Stack:</strong> ${safe(d.previousStack)}</p><p><strong>Institution:</strong> ${safe(d.institution)}</p></div><p>Thank you for choosing 4REAL GLOBAL IT SOLUTION.</p><p><a href="https://chat.whatsapp.com/D77oIhaLk0EKWH7ESaAJaw">Join our WhatsApp group</a></p></div>`});
 logger.info(`Confirmation email sent to ${d.email}`);
});
