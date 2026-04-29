"use client";

import { createClient } from "@/lib/supabase/client";

export type VerificationStatus = "unpaid" | "pending_verification" | "verified" | "rejected";

export async function requestVerification(
  shareId: string,
  billId: string,
  householdId: string,
  paymentNote: string,
  adminUserId: string,
  billTitle: string,
  requesterName: string,
  amount: number
) {
  const supabase = createClient();

  // Update share status to pending
  const { error: updateErr } = await supabase
    .from("bill_shares")
    .update({
      status: "pending_verification",
      payment_note: paymentNote || null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (updateErr) throw updateErr;

  // Notify the admin
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert({
      household_id: householdId,
      user_id: adminUserId,
      type: "payment_pending",
      title: "Payment verification needed",
      message: `${requesterName} marked their share of "${billTitle}" as paid (₦${Number(amount).toLocaleString("en-NG")}). Tap to verify.`,
      metadata: { bill_id: billId, share_id: shareId, amount },
    });

  if (notifErr) throw notifErr;
}

export async function verifyPayment(
  shareId: string,
  billId: string,
  householdId: string,
  payeeUserId: string,
  billTitle: string,
  verifierName: string,
  verifierId: string,
  amount: number
) {
  const supabase = createClient();

  const { error: updateErr } = await supabase
    .from("bill_shares")
    .update({
      status: "verified",
      is_paid: true,
      verified_by: verifierId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", shareId);

  if (updateErr) throw updateErr;

  // Notify the payee if they are not the verifier
  if (payeeUserId !== verifierId) {
    await supabase.from("notifications").insert({
      household_id: householdId,
      user_id: payeeUserId,
      type: "payment_verified",
      title: "Payment verified ✓",
      message: `${verifierName} confirmed your payment for "${billTitle}" (₦${Number(amount).toLocaleString("en-NG")}).`,
      metadata: { bill_id: billId, share_id: shareId, amount },
    });
  }
}

export async function rejectPayment(
  shareId: string,
  billId: string,
  householdId: string,
  payeeUserId: string,
  billTitle: string,
  verifierName: string,
  reason: string,
  amount: number
) {
  const supabase = createClient();

  const { error: updateErr } = await supabase
    .from("bill_shares")
    .update({
      status: "rejected",
      is_paid: false,
      rejection_reason: reason,
      paid_at: null,
    })
    .eq("id", shareId);

  if (updateErr) throw updateErr;

  // Notify the payee
  await supabase.from("notifications").insert({
    household_id: householdId,
    user_id: payeeUserId,
    type: "payment_rejected",
    title: "Payment not verified",
    message: `${verifierName} could not verify your payment for "${billTitle}". Reason: ${reason || "No reason given."}`,
    metadata: { bill_id: billId, share_id: shareId, amount },
  });
}
