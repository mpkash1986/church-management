const messages: Record<string, string> = {
  invalid: "Check the required fields and try again.",
  duplicate: "A record with those unique values already exists.",
  relation: "One or more selected related records do not exist.",
  server: "The record could not be saved. Please try again."
};

export default function FormFeedback({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="notice" role="alert">{messages[error] || "The request could not be completed."}</p>;
}
