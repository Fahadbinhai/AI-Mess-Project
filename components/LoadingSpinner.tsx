'use client';

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-spinner-wrapper">
          <div className="spinner-ring outer-ring"></div>
          <div className="spinner-ring inner-ring"></div>
          <div className="spinner-core">
            <div className="spinner-dot"></div>
          </div>
        </div>
        <p className="loading-text">
          {message}
          <span className="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </p>
      </div>
    </div>
  );
}
