/**
 * SchoolBadge — shows partner school affiliation on member cards.
 * Enrolled = blue  |  Graduated/Alumni = green  |  Faculty = purple
 */

export function getSchoolBorderClass(status, schoolName) {
  if (!schoolName) return '';
  if (status === 'graduated') return 'border-t-4 border-t-green-400';
  if (status === 'faculty')   return 'border-t-4 border-t-purple-400';
  return 'border-t-4 border-t-blue-400'; // enrolled or unset
}

export default function SchoolBadge({ partnerSchoolName, partnerSchoolStatus, className = '' }) {
  if (!partnerSchoolName) return null;

  const cfg =
    partnerSchoolStatus === 'graduated'
      ? { label: '🎓 Alumni',    classes: 'bg-green-100 text-green-800 border border-green-200' }
    : partnerSchoolStatus === 'faculty'
      ? { label: '👩‍🏫 Faculty',  classes: 'bg-purple-100 text-purple-800 border border-purple-200' }
      : { label: '📚 Student',   classes: 'bg-blue-100 text-blue-800 border border-blue-200' };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes} ${className}`}
      title={`${cfg.label} · ${partnerSchoolName}`}
    >
      {cfg.label} · {partnerSchoolName}
    </span>
  );
}
