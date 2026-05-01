import React, { useState } from 'react';

function RaceIdentityPill({ identity, className = '' }) {
  if (!identity) return null;
  const drivers = (identity.drivers || []).filter(Boolean);

  return (
    <div className={`rc-race-identity-pill ${className}`.trim()}>
      <span>{identity.year || '—'}</span>
      <span className="rc-race-identity-sep">·</span>
      <span>{identity.raceName || 'Grand Prix'}</span>
      <span className="rc-race-identity-sep">·</span>
      <span>{identity.sessionName || 'Race'}</span>
      <span className="rc-race-identity-sep">·</span>
      <span>{identity.modeLabel || 'Mode'}</span>
      {identity.countryName && (
        <>
          <span className="rc-race-identity-sep">·</span>
          <span>{identity.countryName}</span>
        </>
      )}
      <span aria-hidden="true">{identity.flagEmoji || '🏁'}</span>
      {drivers.length > 0 && (
        <>
          <span className="rc-race-identity-sep">·</span>
          <span className="rc-race-identity-drivers">{drivers.join(' vs ')}</span>
        </>
      )}
    </div>
  );
}

function VenueFlagBackdrop({ identity }) {
  const [flagError, setFlagError] = useState(false);
  const hasFlagImage = Boolean(identity?.flagUrl) && !flagError;

  if (!identity) return null;

  return (
    <div className="rc-venue-flag-root" aria-hidden="true">
      <div
        className={`rc-venue-flag-backdrop ${hasFlagImage ? 'has-image' : 'is-fallback'}`}
        style={
          hasFlagImage
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(7,10,15,0.24), rgba(7,10,15,0.48)), url(${identity.flagUrl})`,
              }
            : undefined
        }
      >
        {!hasFlagImage && <span className="rc-venue-flag-emoji">{identity.flagEmoji || '🏁'}</span>}
      </div>
      {hasFlagImage && (
        <img
          className="sr-only"
          src={identity.flagUrl}
          alt=""
          aria-hidden="true"
          onError={() => setFlagError(true)}
        />
      )}
    </div>
  );
}

export default function RaceIdentityLayer({ identity, showPill = true, pillClassName = '' }) {
  if (!identity) return null;

  return (
    <>
      <VenueFlagBackdrop identity={identity} />
      {showPill && <RaceIdentityPill identity={identity} className={pillClassName} />}
    </>
  );
}

export { RaceIdentityPill, VenueFlagBackdrop };
