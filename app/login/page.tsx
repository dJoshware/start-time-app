import LoginForm from "./login-form";
import { loginAction } from "@/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
    return <LoginForm action={loginAction} />;
}
