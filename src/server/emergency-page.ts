import { Colors } from '@/constants/theme';

import { EMERGENCY_FIELDS } from './constants';
import { type EmergencyProfile, type Member } from './models';

type Field = (typeof EMERGENCY_FIELDS)[number];

/** Everything member-entered goes through this before it reaches the page. */
function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "+919876543210" style, for tel: links. Indian numbers are stored as ten digits. */
function telHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${/^\d{10}$/.test(digits) ? `+91${digits}` : digits}`;
}

function age(dateOfBirth: Date) {
  const now = new Date();
  let years = now.getFullYear() - dateOfBirth.getFullYear();
  const birthday = new Date(now.getFullYear(), dateOfBirth.getMonth(), dateOfBirth.getDate());
  if (now < birthday) years -= 1;
  return years;
}

const GENDER_LABELS = { male: 'Male', female: 'Female', other: 'Other' } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function list(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function field(label: string, value: string) {
  return `<section class="card"><p class="label">${esc(label)}</p><p class="value">${value}</p></section>`;
}

/** What a stranger sees after scanning the member's QR: only the fields they chose to show. */
export function emergencyPageHtml(
  member: Member,
  profile: (EmergencyProfile & object) | null,
) {
  const visible = new Set<Field>((profile?.visibleFields as Field[] | undefined) ?? EMERGENCY_FIELDS);
  const shows = (id: Field) => visible.has(id);
  const firstName = member.name.split(/\s+/)[0] ?? member.name;

  const about = [
    member.gender ? GENDER_LABELS[member.gender] : null,
    member.dateOfBirth ? `${age(member.dateOfBirth)} years` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const photo =
    shows('photo') && member.photoKey
      ? `<img class="avatar" src="/api/v1/photos/${esc(member.photoKey)}" alt="">`
      : `<div class="avatar">${esc(initials(member.name))}</div>`;

  const allergies = list(profile?.allergies);
  const conditions = list(profile?.conditions);
  const medicines = list(profile?.medicines);
  const contacts = (profile?.emergencyContacts ?? []).filter((contact) => contact.phone);

  const sections: string[] = [];

  if (shows('bloodGroup') && member.bloodGroup) {
    sections.push(
      `<section class="blood"><p class="label">Blood group</p><p class="blood-value">${esc(member.bloodGroup)}</p></section>`,
    );
  }
  if (shows('allergies') && allergies.length) {
    sections.push(field('Allergies', allergies.map(esc).join(', ')));
  }
  if (shows('conditions') && conditions.length) {
    sections.push(field('Conditions', conditions.map(esc).join(', ')));
  }
  if (shows('medicines') && medicines.length) {
    sections.push(field('Current medicines', medicines.map(esc).join('; ')));
  }
  if (shows('emergencyContacts') && contacts.length) {
    const rows = contacts
      .map(
        (contact) => `
        <div class="contact">
          <div>
            <p class="value">${esc(contact.name)}</p>
            ${contact.relation ? `<p class="muted">${esc(contact.relation)}</p>` : ''}
          </div>
          <a class="call" href="${esc(telHref(contact.phone))}">Call</a>
        </div>`,
      )
      .join('');
    sections.push(`<section class="card"><p class="label">Emergency contacts</p>${rows}</section>`);
  }
  if (shows('organDonor') && profile?.organDonor != null) {
    sections.push(field('Organ donor', profile.organDonor ? 'Yes' : 'No'));
  }
  if (shows('insurance') && profile?.insurance?.provider) {
    const { provider, policyNumber } = profile.insurance;
    sections.push(
      field('Insurance', `${esc(provider)}${policyNumber ? `<br><span class="muted">Policy ${esc(policyNumber)}</span>` : ''}`),
    );
  }

  if (!sections.length) {
    sections.push(
      `<section class="card"><p class="muted">${esc(firstName)} has not added medical details yet. Call the helplines below.</p></section>`,
    );
  }

  return layout(
    `${member.name} · Emergency profile`,
    `
    <header class="banner">
      <p class="banner-title">Emergency profile</p>
      <p class="banner-text">If ${esc(firstName)} needs help, call an ambulance first, then their family.</p>
    </header>

    <div class="identity">
      ${photo}
      <div>
        <h1>${esc(member.name)}</h1>
        ${about ? `<p class="muted">${esc(about)}</p>` : ''}
      </div>
    </div>

    ${sections.join('\n')}

    ${helplines()}

    <p class="footnote">Doctors can request full records with the member’s OTP.<br>HealthMatrix</p>`,
  );
}

/** Unknown or revoked code, e.g. a card reported lost. */
export function notFoundPageHtml() {
  return layout(
    'Emergency profile',
    `
    <header class="banner">
      <p class="banner-title">This code is not active</p>
      <p class="banner-text">The card may have been replaced or reported lost. If someone needs help, call now.</p>
    </header>
    ${helplines()}`,
  );
}

function helplines() {
  return `
    <a class="helpline" href="tel:108">Call ambulance 108</a>
    <a class="helpline secondary" href="tel:112">Emergency 112</a>`;
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${Colors.primary}">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; margin: 0; }
  body {
    background: ${Colors.background};
    color: ${Colors.text};
    font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  main { max-width: 480px; margin: 0 auto; padding: 16px 16px 32px; display: grid; gap: 12px; }
  .banner { background: ${Colors.primary}; color: ${Colors.onInk}; border-radius: 16px; padding: 16px; }
  .banner-title { font-weight: 700; font-size: 18px; }
  .banner-text { font-size: 14px; opacity: 0.92; margin-top: 4px; }
  .identity { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
  .avatar {
    width: 56px; height: 56px; border-radius: 50%; flex: none; object-fit: cover;
    display: grid; place-items: center; font-weight: 700; font-size: 20px;
    background: ${Colors.inkMid}; color: ${Colors.onInk};
  }
  h1 { font-size: 20px; line-height: 1.2; }
  .card { background: ${Colors.backgroundElement}; border-radius: 16px; padding: 12px 16px; display: grid; gap: 4px; }
  .blood {
    background: ${Colors.dangerSoft}; border: 1px solid ${Colors.primaryLight};
    border-radius: 16px; padding: 12px 16px;
  }
  .blood .label { color: ${Colors.danger}; }
  .blood-value { font-size: 40px; font-weight: 800; line-height: 1.1; color: ${Colors.primary}; }
  .label { font-size: 13px; color: ${Colors.textSecondary}; }
  .value { font-weight: 600; overflow-wrap: anywhere; }
  .muted { font-size: 14px; color: ${Colors.textSecondary}; }
  .contact { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 8px; }
  .call {
    flex: none; background: ${Colors.primary}; color: ${Colors.onInk}; text-decoration: none;
    font-weight: 700; font-size: 14px; padding: 8px 16px; border-radius: 8px;
  }
  .helpline {
    display: block; text-align: center; text-decoration: none; font-weight: 700;
    padding: 14px; border-radius: 16px; background: ${Colors.primary}; color: ${Colors.onInk};
  }
  .helpline.secondary { background: ${Colors.ink}; }
  .footnote { text-align: center; font-size: 13px; color: ${Colors.textSecondary}; margin-top: 4px; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}
