import { AskAiResponse, NormalizedRecord } from '../types';
import { sanitizeOrgName } from './dataEngine';

export function answerQuestionLocally(
  question: string,
  records: NormalizedRecord[]
): AskAiResponse {
  const totalRecords = records.length;

  const orgMap = new Map<
    string,
    {
      primary: string;
      count: number;
      events: Set<string>;
    }
  >();

  records.forEach((record) => {
    if (!record.organization_name) return;
    const key = sanitizeOrgName(record.organization_name);
    if (!key) return;

    if (!orgMap.has(key)) {
      orgMap.set(key, {
        primary: record.organization_name,
        count: 0,
        events: new Set<string>(),
      });
    }

    const org = orgMap.get(key)!;
    org.count += 1;
    if (record.event_name) org.events.add(record.event_name);
  });

  const orgList = Array.from(orgMap.values()).sort((a, b) => b.count - a.count);

  const eventCounts = new Map<string, number>();
  records.forEach((record) => {
    if (!record.event_name) return;
    eventCounts.set(record.event_name, (eventCounts.get(record.event_name) || 0) + 1);
  });
  const sortedEvents = Array.from(eventCounts.entries()).sort((a, b) => b[1] - a[1]);

  const participantMap = new Map<
    string,
    {
      name: string;
      email: string;
      events: Set<string>;
      position: string;
      org: string;
    }
  >();

  records.forEach((record) => {
    const key = (record.email || record.participant_name || '').toLowerCase().trim();
    if (!key) return;

    if (!participantMap.has(key)) {
      participantMap.set(key, {
        name: record.participant_name,
        email: record.email,
        events: new Set<string>(),
        position: record.position,
        org: record.organization_name,
      });
    }

    if (record.event_name) participantMap.get(key)!.events.add(record.event_name);
  });

  const crossEventParticipants = Array.from(participantMap.values()).filter(
    (participant) => participant.events.size > 1
  );

  const qLower = question.toLowerCase();
  const terms = qLower
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}@._-]/gu, ''))
    .filter((term) => term.length > 2);

  const matchedRecords = records.filter((record) => {
    const searchable = `${record.participant_name} ${record.organization_name} ${record.email} ${record.position} ${record.event_name}`.toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });

  let calculationType = 'Dataset Aggregate Calculation';
  let matchingCount = totalRecords;
  let sampleItems = orgList
    .slice(0, 8)
    .map((org) => `${org.primary}: ${org.count} attendees across ${org.events.size} events`);

  if (matchedRecords.length > 0 && matchedRecords.length < totalRecords) {
    calculationType = `Targeted Search Match (${matchedRecords.length} records found)`;
    matchingCount = matchedRecords.length;
    sampleItems = matchedRecords
      .slice(0, 8)
      .map(
        (record) =>
          `${record.participant_name} (${record.position} @ ${record.organization_name}) [${record.event_name}]`
      );
  }

  const rawSummary = `Processed ${totalRecords} records across ${sortedEvents.length} events and ${orgList.length} organizations. Found ${matchedRecords.length} specific term matches for question: "${question}". Local browser fallback was used because the server AI route was unavailable.`;

  const isVietnamese =
    /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(
      question
    ) ||
    qLower.includes('bao nhiêu') ||
    qLower.includes('nào') ||
    qLower.includes('những') ||
    qLower.includes('cho tôi');

  let answer = '';
  let suggestedFollowups: string[] = [];

  if (
    qLower.includes('tổ chức') ||
    qLower.includes('công ty') ||
    qLower.includes('organization') ||
    qLower.includes('company')
  ) {
    const asksForCount =
      qLower.includes('bao nhiêu') ||
      qLower.includes('how many') ||
      qLower.includes('số lượng') ||
      qLower.includes('count');

    if (asksForCount) {
      answer = isVietnamese
        ? `Trong dữ liệu hiện tại có **${orgList.length} tổ chức / doanh nghiệp duy nhất** từ ${totalRecords} bản ghi thuộc ${sortedEvents.length} sự kiện.\n\n${orgList
            .slice(0, 5)
            .map(
              (org) =>
                `• **${org.primary}**: ${org.count} người tham dự (${org.events.size} sự kiện)`
            )
            .join('\n')}`
        : `There are **${orgList.length} unique organizations** across ${totalRecords} attendee records from ${sortedEvents.length} events.\n\n${orgList
            .slice(0, 5)
            .map(
              (org) => `• **${org.primary}**: ${org.count} attendees (${org.events.size} events)`
            )
            .join('\n')}`;
    } else {
      answer = isVietnamese
        ? `Các tổ chức tham gia nhiều nhất trong dữ liệu hiện tại:\n\n${orgList
            .slice(0, 6)
            .map(
              (org) =>
                `• **${org.primary}**: ${org.count} lượt tham dự (${org.events.size} chương trình)`
            )
            .join('\n')}`
        : `Top participating organizations in the current dataset:\n\n${orgList
            .slice(0, 6)
            .map(
              (org) =>
                `• **${org.primary}**: ${org.count} participants across ${org.events.size} programs`
            )
            .join('\n')}`;
    }

    suggestedFollowups = isVietnamese
      ? [
          'Hiển thị danh sách các C-level hoặc Director.',
          'Những người tham dự nào tham gia nhiều hơn 1 sự kiện?',
          'Sự kiện nào có số người tham dự đông nhất?',
        ]
      : [
          'Show all CTOs and Directors.',
          'Which participants attended more than one event?',
          'Which event had the highest participation?',
        ];
  } else if (
    qLower.includes('nhiều hơn 1') ||
    qLower.includes('trùng') ||
    qLower.includes('multi-event') ||
    qLower.includes('cross-event') ||
    qLower.includes('vip')
  ) {
    answer = isVietnamese
      ? `Phát hiện **${crossEventParticipants.length} người tham dự** xuất hiện ở từ 2 sự kiện trở lên:\n\n${crossEventParticipants
          .slice(0, 8)
          .map(
            (participant) =>
              `• **${participant.name}** (${participant.position || 'N/A'} @ ${participant.org || 'N/A'}) - ${Array.from(participant.events).join(', ')}`
          )
          .join('\n')}`
      : `Identified **${crossEventParticipants.length} participants** who attended 2 or more events:\n\n${crossEventParticipants
          .slice(0, 8)
          .map(
            (participant) =>
              `• **${participant.name}** (${participant.position || 'N/A'} @ ${participant.org || 'N/A'}) - ${Array.from(participant.events).join(', ')}`
          )
          .join('\n')}`;

    suggestedFollowups = isVietnamese
      ? ['Công ty nào gửi nhiều đại diện nhất?', 'Hiển thị tất cả CTOs.', 'Có tổng cộng bao nhiêu sự kiện?']
      : ['Which company sent the most representatives?', 'Show all CTOs.', 'How many total events are connected?'];
  } else if (
    qLower.includes('cto') ||
    qLower.includes('ceo') ||
    qLower.includes('director') ||
    qLower.includes('giám đốc') ||
    qLower.includes('chức vụ') ||
    qLower.includes('position')
  ) {
    const leaders = records.filter((record) =>
      /cto|ceo|c-level|director|giám đốc|trưởng phòng|head|lead|founder/i.test(
        record.position || ''
      )
    );

    matchingCount = leaders.length;
    calculationType = 'Leadership Position Filter';
    sampleItems = leaders
      .slice(0, 8)
      .map(
        (record) =>
          `${record.participant_name} - ${record.position} (${record.organization_name}) [${record.event_name}]`
      );

    answer = isVietnamese
      ? `Tìm thấy **${leaders.length} lãnh đạo / quản lý** trong dữ liệu:\n\n${leaders
          .slice(0, 8)
          .map(
            (record) =>
              `• **${record.participant_name}** - ${record.position} (${record.organization_name}) [${record.event_name}]`
          )
          .join('\n')}`
      : `Found **${leaders.length} executives/managers** in the dataset:\n\n${leaders
          .slice(0, 8)
          .map(
            (record) =>
              `• **${record.participant_name}** - ${record.position} (${record.organization_name}) [${record.event_name}]`
          )
          .join('\n')}`;

    suggestedFollowups = isVietnamese
      ? ['Các công ty nào có nhiều đại diện nhất?', 'Có bao nhiêu tổ chức duy nhất?', 'Sự kiện nào đông nhất?']
      : ['Which companies have the most attendees?', 'How many unique organizations exist?', 'Which event is the largest?'];
  } else if (
    qLower.includes('sự kiện') ||
    qLower.includes('event') ||
    qLower.includes('đông nhất') ||
    qLower.includes('highest')
  ) {
    answer = isVietnamese
      ? `Số lượng người tham dự theo từng sự kiện:\n\n${sortedEvents
          .map(([eventName, count]) => `• **${eventName}**: ${count} người tham dự`)
          .join('\n')}`
      : `Attendee counts by event:\n\n${sortedEvents
          .map(([eventName, count]) => `• **${eventName}**: ${count} registered attendees`)
          .join('\n')}`;

    suggestedFollowups = isVietnamese
      ? ['Những tổ chức nào tham gia nhiều nhất?', 'Có bao nhiêu người tham dự nhiều sự kiện?', 'Hiển thị tất cả CTOs.']
      : ['Which organizations participated the most?', 'How many cross-event attendees exist?', 'Show all CTOs.'];
  } else if (matchedRecords.length > 0) {
    answer = isVietnamese
      ? `Tìm thấy **${matchedRecords.length} bản ghi** phù hợp:\n\n${matchedRecords
          .slice(0, 8)
          .map(
            (record) =>
              `• **${record.participant_name}** - ${record.position || 'N/A'} tại **${record.organization_name || 'N/A'}** (${record.event_name})`
          )
          .join('\n')}`
      : `Found **${matchedRecords.length} matching records**:\n\n${matchedRecords
          .slice(0, 8)
          .map(
            (record) =>
              `• **${record.participant_name}** - ${record.position || 'N/A'} at **${record.organization_name || 'N/A'}** (${record.event_name})`
          )
          .join('\n')}`;

    suggestedFollowups = isVietnamese
      ? ['Có bao nhiêu tổ chức duy nhất?', 'Ai tham dự nhiều hơn 1 sự kiện?', 'Sự kiện nào đông nhất?']
      : ['How many unique organizations exist?', 'Who attended more than one event?', 'Which event is the largest?'];
  } else {
    answer = isVietnamese
      ? `Bộ dữ liệu hiện tại có **${totalRecords} bản ghi**, **${sortedEvents.length} sự kiện** và **${orgList.length} tổ chức**.\n\nCác tổ chức hàng đầu: ${orgList
          .slice(0, 3)
          .map((org) => org.primary)
          .join(', ') || 'chưa có dữ liệu'}.`
      : `The current dataset contains **${totalRecords} records**, **${sortedEvents.length} events**, and **${orgList.length} organizations**.\n\nTop organizations: ${orgList
          .slice(0, 3)
          .map((org) => org.primary)
          .join(', ') || 'no data yet'}.`;

    suggestedFollowups = isVietnamese
      ? [
          'Những tổ chức nào đã tham gia nhiều sự kiện nhất?',
          'Có bao nhiêu tổ chức duy nhất trong bộ dữ liệu?',
          'Những người tham dự nào đã tham gia nhiều hơn 1 sự kiện?',
        ]
      : [
          'Which organizations participated in the most events?',
          'How many unique organizations are in the dataset?',
          'Which participants attended more than one event?',
        ];
  }

  return {
    answer,
    groundedFact: {
      calculationType,
      matchingCount,
      sampleItems: sampleItems.slice(0, 8),
      rawSummary,
    },
    suggestedFollowups,
    intentType: calculationType,
  };
}
