/**
 * Utility to format and resolve the recipients notified for absence and late arrival submissions.
 */

export interface AbsenceNotificationRecipients {
  sectionLeaderNames: string[];
  sectionGroup?: string;
  conductorName: string;
  adminLabel: string;
  summaryText: string;
  formattedList: string[];
}

export function formatAbsenceRecipients(params: {
  sectionGroup?: string;
  sectionLeaders?: string[];
  conductorName?: string;
}): AbsenceNotificationRecipients {
  const { sectionGroup, sectionLeaders = [], conductorName = 'Adam Reinwald' } = params;

  const sectionLeaderNames = sectionLeaders.filter(Boolean);
  const adminLabel = 'Attendance administration & artistic staff';

  const formattedList: string[] = [];

  if (sectionLeaderNames.length > 0) {
    const title = sectionGroup
      ? `${sectionGroup} Section Leader${sectionLeaderNames.length > 1 ? 's' : ''}`
      : 'Section Leader';
    formattedList.push(`${sectionLeaderNames.join(' & ')} (${title})`);
  } else if (sectionGroup) {
    formattedList.push(`your ${sectionGroup} Section Leader`);
  }

  formattedList.push(`${conductorName} (Artistic Director)`);
  formattedList.push(adminLabel);

  let summaryText = '';
  if (formattedList.length === 1) {
    summaryText = formattedList[0];
  } else if (formattedList.length === 2) {
    summaryText = `${formattedList[0]} and ${formattedList[1]}`;
  } else {
    summaryText = `${formattedList.slice(0, -1).join(', ')}, and ${formattedList[formattedList.length - 1]}`;
  }

  return {
    sectionLeaderNames,
    sectionGroup,
    conductorName,
    adminLabel,
    summaryText,
    formattedList,
  };
}
