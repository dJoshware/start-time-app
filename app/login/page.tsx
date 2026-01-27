import { loginAction } from "@/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: { error?: string };
}) {
    const error = searchParams?.error
        ? decodeURIComponent(searchParams.error)
        : null;

    return (
        <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
            <h1>Start Times</h1>

            {error ? (
                <p
                    style={{
                        padding: 10,
                        border: "1px solid #f5c2c7",
                        background: "#f8d7da",
                    }}>
                    {error}
                </p>
            ) : null}

            <form
                action={loginAction}
                style={{ display: "grid", gap: 12 }}>
                <label>
                    Employee ID (7 digits)
                    <input
                        name='employeeId'
                        inputMode='numeric'
                        placeholder='1234567'
                    />
                </label>

                <label>
                    PIN
                    <input
                        name='pin'
                        type='password'
                        inputMode='numeric'
                        placeholder='••••'
                    />
                </label>

                <button type='submit'>Sign in</button>
            </form>
        </main>
    );
}
