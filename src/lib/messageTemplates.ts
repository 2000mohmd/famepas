/** Adnan, Venue Portal item 26: default templates so a venue never starts
 * from a blank box, in English and Arabic. Shown whenever a venue has no
 * saved template of that type yet; "Save as template" on the response
 * dialog adds the venue's own version alongside these. */
export type TemplateType = "rejection" | "acceptance" | "reminder" | "thank_you";

export const TEMPLATE_TYPE_LABEL: Record<TemplateType, string> = {
  rejection: "Decline",
  acceptance: "Acceptance / confirmation",
  reminder: "Visit reminder",
  thank_you: "Thank-you / content request",
};

export const DEFAULT_TEMPLATES: Record<TemplateType, { en: string; ar: string }> = {
  rejection: {
    en: "Thank you for your interest in collaborating with us. After reviewing your application, we've decided to move forward with other creators this time. We hope to work together in the future!",
    ar: "شكرًا لاهتمامك بالتعاون معنا. بعد مراجعة طلبك، قررنا المتابعة مع صناع محتوى آخرين في الوقت الحالي. نتمنى التعاون معك في المستقبل!",
  },
  acceptance: {
    en: "Great news — your application has been approved! Check your FamePass bookings to see your visit details and get ready to create amazing content with us.",
    ar: "خبر رائع — تم قبول طلبك! تحقق من حجوزاتك على FamePass لمعرفة تفاصيل زيارتك واستعد لإنشاء محتوى رائع معنا.",
  },
  reminder: {
    en: "Just a friendly reminder about your upcoming visit with us! We're looking forward to hosting you — see you soon.",
    ar: "تذكير ودي بزيارتك القادمة إلينا! نتطلع لاستضافتك — نراك قريبًا.",
  },
  thank_you: {
    en: "Thank you so much for visiting and creating content with us! We'd love to see your post whenever it's ready.",
    ar: "شكرًا جزيلاً لزيارتك وإنشاء المحتوى معنا! يسعدنا رؤية منشورك عندما يكون جاهزًا.",
  },
};
