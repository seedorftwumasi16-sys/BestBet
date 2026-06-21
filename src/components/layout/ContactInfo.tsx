"use client";

import { Mail, Phone } from "lucide-react";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONES,
  toMailtoHref,
  toTelHref,
} from "@/lib/contact";
import { cn } from "@/lib/utils";

interface ContactInfoProps {
  variant?: "footer" | "compact" | "card";
  className?: string;
}

export function ContactInfo({ variant = "footer", className }: ContactInfoProps) {
  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-bestbet-yellow mb-2">
          Contact Support
        </p>
        <a
          href={toMailtoHref()}
          className="contact-link flex items-center gap-2.5 text-sm text-bestbet-gray-muted"
        >
          <span className="contact-icon-wrap">
            <Mail size={14} />
          </span>
          {SUPPORT_EMAIL}
        </a>
        {SUPPORT_PHONES.map((phone) => (
          <a
            key={phone.display}
            href={toTelHref(phone)}
            className="contact-link flex items-center gap-2.5 text-sm text-bestbet-gray-muted"
          >
            <span className="contact-icon-wrap">
              <Phone size={14} />
            </span>
            {phone.display}
          </a>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-bestbet-yellow/15 bg-bestbet-gray/30 p-5 space-y-4",
          className
        )}
      >
        <div>
          <h3 className="text-sm font-bold text-white">Need Help?</h3>
          <p className="text-xs text-bestbet-gray-muted mt-1">
            Our support team is available to assist with deposits, withdrawals, and account issues.
          </p>
        </div>
        <div className="space-y-3">
          <a href={toMailtoHref()} className="contact-link group flex items-center gap-3 text-sm">
            <span className="contact-icon-wrap">
              <Mail size={16} />
            </span>
            <span className="text-bestbet-gray-muted group-hover:text-white transition-colors">
              {SUPPORT_EMAIL}
            </span>
          </a>
          {SUPPORT_PHONES.map((phone) => (
            <a
              key={phone.display}
              href={toTelHref(phone)}
              className="contact-link group flex items-center gap-3 text-sm"
            >
              <span className="contact-icon-wrap">
                <Phone size={16} />
              </span>
              <span className="text-bestbet-gray-muted group-hover:text-white transition-colors tabular-nums">
                {phone.display}
              </span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("contact-info-block", className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-bestbet-yellow mb-3">
        Contact Us
      </p>
      <ul className="space-y-3">
        <li>
          <a href={toMailtoHref()} className="contact-link group flex items-center gap-3 text-sm">
            <span className="contact-icon-wrap shrink-0">
              <Mail size={16} className="text-bestbet-yellow" />
            </span>
            <span className="text-bestbet-gray-muted group-hover:text-white transition-colors">
              {SUPPORT_EMAIL}
            </span>
          </a>
        </li>
        {SUPPORT_PHONES.map((phone) => (
          <li key={phone.display}>
            <a
              href={toTelHref(phone)}
              className="contact-link group flex items-center gap-3 text-sm"
              aria-label={`Call ${phone.label}: ${phone.display}`}
            >
              <span className="contact-icon-wrap shrink-0">
                <Phone size={16} className="text-bestbet-yellow" />
              </span>
              <span className="text-bestbet-gray-muted group-hover:text-white transition-colors tabular-nums tracking-wide">
                {phone.display}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
