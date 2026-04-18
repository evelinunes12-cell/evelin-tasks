// Lightweight pass-through wrapper. The previous opacity/translate animation
// added a perceptible delay on every route change and is no longer needed.
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PageTransition;
