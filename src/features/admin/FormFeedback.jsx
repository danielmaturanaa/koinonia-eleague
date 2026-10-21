export function FormFeedback({ mutation }) {
  if (mutation.error) return <p className="form-feedback error" role="alert">{mutation.error.message}</p>;
  if (mutation.success) return <p className="form-feedback success" role="status">{mutation.success}</p>;
  return null;
}
