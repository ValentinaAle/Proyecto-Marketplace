type AlertProps = {
  tone: 'danger' | 'success';
  children: string;
};

export function Alert({ tone, children }: AlertProps) {
  return <div className={`alert alert--${tone}`} role="alert">{children}</div>;
}
