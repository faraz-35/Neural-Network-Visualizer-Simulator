import React from 'react';

export const ResetIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0121.5 13.5M20 20l-1.5-1.5A9 9 0 002.5 10.5" />
    </svg>
);