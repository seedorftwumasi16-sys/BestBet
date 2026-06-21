"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { ContactInfo } from "@/components/layout/ContactInfo";
import { SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/contact";
import { HeadphonesIcon } from "lucide-react";

export default function ContactPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-6 pb-28 xl:pb-6 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bestbet-yellow/10 border border-bestbet-yellow/25">
            <HeadphonesIcon size={28} className="text-bestbet-yellow" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black font-display">Contact Support</h1>
          <p className="text-sm text-bestbet-gray-muted max-w-md mx-auto leading-relaxed">
            Reach the BestBet support team for help with deposits, withdrawals, betting, and account
            verification.
          </p>
        </div>

        <ContactInfo variant="card" />

        <div className="glass-panel rounded-2xl p-5 text-center text-sm text-bestbet-gray-muted">
          <p>
            Email us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-bestbet-yellow hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            or call{" "}
            {SUPPORT_PHONES.map((phone, i) => (
              <span key={phone.display}>
                {i > 0 && " / "}
                <a href={`tel:${phone.tel}`} className="text-bestbet-yellow hover:underline tabular-nums">
                  {phone.display}
                </a>
              </span>
            ))}{" "}
            — available daily.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
