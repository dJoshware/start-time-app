"use client";

import * as React from "react";

export default function AutoSubmitSelect(
    props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
    return (
        <select
            {...props}
            onChange={e => {
                props.onChange?.(e);
                // submit the closest form
                e.currentTarget.form?.requestSubmit();
            }}
        />
    );
}
