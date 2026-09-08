export function FormFeedback({ mutation }) {
  if (mutation.error) return <p className="form-feedback error">{mutation.error.message}</p>;
  if (mutation.success) return <p className="form-feedback success">{mutation.success}</p>;
  return null;
}
