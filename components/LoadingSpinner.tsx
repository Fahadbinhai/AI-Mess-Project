'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="loading-screen">
      <div className="loading-minimal">
        <div className="spinner-minimal"></div>
        {message && <p className="loading-text-minimal">{message}</p>}
      </div>
    </div>
  );
}

