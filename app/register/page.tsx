import RegisterForm from "./register-form";
import { registerAction } from "@/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RegisterPage() {
    return <RegisterForm action={registerAction} />;
}
