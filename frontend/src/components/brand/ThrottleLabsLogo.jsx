import React, { useState } from 'react';
import throttlelabsLogo from '../../assets/throttlelabs-logo.png';

export default function ThrottleLabsLogo({
  variant = 'compact',
  showDomain = false,
  className = '',
  imgClassName = '',
  textClassName = '',
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const useImage = Boolean(throttlelabsLogo) && !imageFailed;

  return (
    <div className={`rc-brand-logo rc-brand-logo-${variant} ${className}`.trim()}>
      {useImage ? (
        <img
          src={throttlelabsLogo}
          alt="ThrottleLabs"
          className={`rc-brand-logo-image ${imgClassName}`.trim()}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={`rc-brand-wordmark ${textClassName}`.trim()}>
          <span className="rc-brand-wordmark-main">ThrottleLabs</span>
          {showDomain && <span className="rc-brand-wordmark-domain">.in</span>}
        </div>
      )}
    </div>
  );
}
