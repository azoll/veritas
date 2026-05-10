import { SignIn } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand/Wordmark";

export default function SignInPage() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <Wordmark tagline />
        <SignIn />
      </div>
    </div>
  );
}
