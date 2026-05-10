import { SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand/Wordmark";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <div className="flex flex-col items-center gap-10">
        <Wordmark tagline />
        <SignUp appearance={{ elements: { card: "shadow-none border hairline rounded-sm" } }} />
      </div>
    </div>
  );
}
