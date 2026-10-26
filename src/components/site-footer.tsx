import { Mark } from "@/components/mark";

type Social = {
  instagram: string;
  linkedin: string;
  x: string;
  telegram: string;
};

export function SiteFooter({
  brandName,
  brandLogo,
  tagline,
  rights,
  note,
  phone,
  email,
  whatsapp,
  social,
  contactLabel,
  socialLabel,
}: {
  brandName: string;
  brandLogo?: string;
  tagline: string;
  rights: string;
  note: string;
  phone: string;
  email: string;
  whatsapp: string;
  social: Social;
  contactLabel: string;
  socialLabel: string;
}) {
  const socialLinks = (
    [
      { id: "instagram", label: "Instagram", href: social.instagram, icon: InstagramIcon },
      { id: "linkedin", label: "LinkedIn", href: social.linkedin, icon: LinkedInIcon },
      { id: "x", label: "X", href: social.x, icon: XIcon },
      { id: "telegram", label: "Telegram", href: social.telegram, icon: TelegramIcon },
    ] as const
  ).filter((item) => item.href.trim());

  return (
    <footer className="border-t border-white/10 bg-palm-deep text-[#e7f2ec]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-12 md:grid-cols-[1.35fr_1fr_1fr] md:gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <Mark tone="light" src={brandLogo} alt="" />
              <span className="text-lg font-semibold tracking-tight">{brandName}</span>
            </div>
            <p className="mt-5 max-w-sm text-base leading-8 text-[#d5e4db]">{tagline}</p>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-wide text-[#e4c27a]">{contactLabel}</p>
            <ul className="mt-5 space-y-3">
              {phone ? (
                <li>
                  <a
                    href={`tel:${phone.replace(/\s/g, "")}`}
                    className="group inline-flex items-center gap-3 text-sm text-[#d5e4db] transition hover:text-white"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:bg-[#e4c27a]/15 group-hover:ring-[#e4c27a]/40">
                      <PhoneIcon />
                    </span>
                    <span dir="ltr">{phone}</span>
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-3 text-sm text-[#d5e4db] transition hover:text-white"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:bg-[#e4c27a]/15 group-hover:ring-[#e4c27a]/40">
                      <WhatsAppIcon />
                    </span>
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="group inline-flex items-center gap-3 text-sm text-[#d5e4db] transition hover:text-white"
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:bg-[#e4c27a]/15 group-hover:ring-[#e4c27a]/40">
                      <MailIcon />
                    </span>
                    <span className="break-all">{email}</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-wide text-[#e4c27a]">{socialLabel}</p>
            <ul className="mt-5 flex flex-wrap gap-3">
              {socialLinks.map(({ id, label, href, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="group grid size-11 place-items-center rounded-full bg-white/5 text-[#e7f2ec] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#e4c27a] hover:text-palm-deep hover:ring-[#e4c27a] hover:shadow-[0_12px_28px_-14px_rgba(228,194,122,0.7)]"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="max-w-3xl text-xs leading-6 text-[#d5e4db]/75">{rights}</p>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-[#d5e4db]/75">{note}</p>
        </div>
      </div>
    </footer>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M7.5 4.5h3l1.2 3.2-1.8 1.2a12 12 0 0 0 5.2 5.2l1.2-1.8 3.2 1.2v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 4.5 6.1 1.5 1.5 0 0 1 6 4.5Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
      <path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.4 20.6l4.4-1.1A8.7 8.7 0 1 0 12 3.2Zm0 1.6a7.1 7.1 0 0 1 6 10.9 7.1 7.1 0 0 1-9.9 1.5l-.3-.2-2.6.7.7-2.5-.2-.3A7.1 7.1 0 0 1 12 4.8Zm4 8.6c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.2-.4.1a5.8 5.8 0 0 1-1.7-1 6.5 6.5 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.4.1-.2c0-.1 0-.2 0-.3s-.5-1.1-.6-1.5c-.2-.4-.4-.3-.5-.3h-.4c-.1 0-.3.1-.5.3s-.6.6-.6 1.5.6 1.8.7 1.9c.1.1 1.2 1.9 3 2.6 1.8.8 1.8.5 2.1.5.3 0 1-.4 1.2-.8.1-.4.1-.7.1-.8 0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m5 8 7 5 7-5" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M6.4 9.2H3.6V20h2.8V9.2ZM5 3.8a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM20.4 20h-2.8v-5.6c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.6-.1.9V20h-2.8s0-8.7 0-9.6h2.8v1.4c.4-.6 1.4-1.6 3.2-1.6 2.3 0 4.1 1.5 4.1 4.8V20Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
      <path d="M17.6 3.8h2.5l-5.5 6.3 6.5 8.6h-5.1l-4-5.2-4.6 5.2H4.9l5.9-6.7L4.6 3.8h5.2l3.6 4.8 4.2-4.8Zm-.9 13.4h1.4L7.4 5.2H6L16.7 17.2Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.5 4.4 3.9 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.6 5c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3-14.2c.3-1.2-.5-1.7-1.4-1.4Zm-3.1 3.4-8.4 7.6-.4 3.1-1.4-4.7 10.2-5.9Z" />
    </svg>
  );
}
