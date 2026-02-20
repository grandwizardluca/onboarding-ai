import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionRow {
  date: string;
  startTime: string;
  duration: string;
  activeMinutes: string;
  mouseEvents: number;
  keyboardEvents: number;
  questions: number;
}

export interface RecentSessionActivity {
  date: string;
  startTime: string;
  duration: string;
  activeIntervals: number;
  idleIntervals: number;
  topics: string[];
}

export interface TopicRow {
  label: string;
  category: string;
  mentions: number;
  conversations: number;
  status: "Not Started" | "Weak" | "Developing" | "Strong";
}

export interface ReportData {
  studentEmail: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  stats: {
    streakDays: number;
    totalSessions: number;
    totalMessages: number;
    topicsCovered: number;
    totalActiveMinutes: number;
    engagementScore: number;
  };
  sessions: SessionRow[];
  recentSessionActivity: RecentSessionActivity[];
  topics: TopicRow[];
  totalActiveMinutes: number;
  totalSessionMinutes: number;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 48,
    paddingBottom: 72,
    paddingHorizontal: 52,
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  // Footer (fixed — renders on every page)
  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: "#888",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.5,
    color: "#555",
    lineHeight: 1.5,
    marginBottom: 2,
  },
  footerPageNum: {
    fontSize: 6.5,
    color: "#888",
    textAlign: "right",
  },

  // Section header
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },

  // ── Cover page ──
  coverWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 36,
  },
  coverRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    width: 180,
    alignSelf: "center",
    marginBottom: 36,
  },
  coverMeta: {
    alignItems: "center",
    marginBottom: 16,
  },
  coverMetaLabel: {
    fontSize: 7.5,
    color: "#777",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  coverMetaValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "center",
  },
  coverBadge: {
    marginTop: 36,
    borderWidth: 1,
    borderColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: "center",
  },
  coverBadgeText: {
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
  },

  // ── Executive Summary ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    width: "30%",
    borderWidth: 0.5,
    borderColor: "#bbb",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 7,
    color: "#777",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  statValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
  },
  statUnit: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  statSub: {
    fontSize: 7,
    color: "#999",
    marginTop: 2,
  },
  summaryNote: {
    fontSize: 8,
    color: "#444",
    lineHeight: 1.6,
    borderLeftWidth: 2,
    borderLeftColor: "#000",
    paddingLeft: 8,
    marginTop: 8,
  },

  // ── Table (session log & topic coverage) ──
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderTopWidth: 0.5,
    borderBottomWidth: 1,
    borderColor: "#999",
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
    backgroundColor: "#fafafa",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 7.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  // Column width helpers (flex values)
  colDate: { flex: 2.2 },
  colTime: { flex: 1.5 },
  colDur: { flex: 1.6 },
  colActive: { flex: 1.8 },
  colMouse: { flex: 1.5 },
  colKeyboard: { flex: 1.5 },
  colQ: { flex: 1.3 },

  // Topic table columns
  colTopic: { flex: 3.5 },
  colCat: { flex: 2 },
  colMentions: { flex: 1.4 },
  colConvs: { flex: 1.4 },
  colStatus: { flex: 2 },

  // ── Activity timeline blocks ──
  sessionBlock: {
    marginBottom: 14,
    borderLeftWidth: 1.5,
    borderLeftColor: "#333",
    paddingLeft: 10,
  },
  sessionBlockHead: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 3,
  },
  sessionBlockLine: {
    fontSize: 8,
    color: "#333",
    lineHeight: 1.55,
  },
  sessionTopics: {
    fontSize: 7.5,
    color: "#555",
    marginTop: 3,
    fontStyle: "italic",
  },

  // ── Engagement analysis ──
  engagementBar: {
    height: 18,
    flexDirection: "row",
    borderWidth: 0.5,
    borderColor: "#000",
    marginBottom: 6,
    marginTop: 4,
    overflow: "hidden",
  },
  engagementFill: {
    backgroundColor: "#000",
    height: "100%",
  },
  engagementEmpty: {
    backgroundColor: "#e8e8e8",
    height: "100%",
  },
  engagementLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  engagementLabelText: {
    fontSize: 7.5,
    color: "#444",
  },
  engagementStatement: {
    fontSize: 9,
    lineHeight: 1.7,
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: "#000",
    padding: 10,
  },
  signatureBlock: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureLine: {
    borderTopWidth: 0.5,
    borderTopColor: "#000",
    width: 180,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {`This report contains forensic activity tracking data including timestamped mouse activity, keyboard activity, and question frequency. Generated automatically by Socratic.sg on ${generatedAt}.`}
      </Text>
      <Text
        style={s.footerPageNum}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page 1 — Cover
// ---------------------------------------------------------------------------

function CoverPage({
  studentEmail,
  dateFrom,
  dateTo,
  generatedAt,
}: {
  studentEmail: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.coverWrap}>
        <Text style={s.coverTitle}>STUDY ACTIVITY REPORT</Text>
        <Text style={s.coverSubtitle}>Socratic.sg · Forensic Engagement Record</Text>
        <View style={s.coverRule} />

        <View style={s.coverMeta}>
          <Text style={s.coverMetaLabel}>Student</Text>
          <Text style={s.coverMetaValue}>{studentEmail}</Text>
        </View>

        <View style={s.coverMeta}>
          <Text style={s.coverMetaLabel}>Report Period</Text>
          <Text style={s.coverMetaValue}>
            {dateFrom} — {dateTo}
          </Text>
        </View>

        <View style={s.coverMeta}>
          <Text style={s.coverMetaLabel}>Generated</Text>
          <Text style={[s.coverMetaValue, { fontSize: 9 }]}>{generatedAt}</Text>
        </View>

        <View style={s.coverBadge}>
          <Text style={[s.coverBadgeText, { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 }]}>
            Forensic Study Report
          </Text>
          <Text style={[s.coverBadgeText, { fontSize: 8 }]}>{studentEmail}</Text>
        </View>
      </View>
      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Page 2 — Executive Summary
// ---------------------------------------------------------------------------

function SummaryPage({
  stats,
  generatedAt,
}: {
  stats: ReportData["stats"];
  generatedAt: string;
}) {
  const activeHours = Math.floor(stats.totalActiveMinutes / 60);
  const activeMins = stats.totalActiveMinutes % 60;
  const activeStr =
    activeHours > 0 ? `${activeHours}h ${activeMins}m` : `${activeMins}m`;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>Executive Summary</Text>

      <View style={s.statsGrid}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Active Study Time</Text>
          <Text style={s.statValue}>
            {activeHours > 0 ? `${activeHours}` : activeMins}
            <Text style={s.statUnit}>{activeHours > 0 ? "h" : "m"}</Text>
          </Text>
          <Text style={s.statSub}>{activeStr} total active engagement</Text>
        </View>

        <View style={s.statBox}>
          <Text style={s.statLabel}>Study Streak</Text>
          <Text style={s.statValue}>
            {stats.streakDays}
            <Text style={s.statUnit}>d</Text>
          </Text>
          <Text style={s.statSub}>Consecutive days with activity</Text>
        </View>

        <View style={s.statBox}>
          <Text style={s.statLabel}>Topics Covered</Text>
          <Text style={s.statValue}>
            {stats.topicsCovered}
            <Text style={s.statUnit}>/12</Text>
          </Text>
          <Text style={s.statSub}>H2 Economics curriculum topics</Text>
        </View>

        <View style={s.statBox}>
          <Text style={s.statLabel}>Questions Asked</Text>
          <Text style={s.statValue}>{stats.totalMessages}</Text>
          <Text style={s.statSub}>Student-initiated AI interactions</Text>
        </View>

        <View style={s.statBox}>
          <Text style={s.statLabel}>Study Sessions</Text>
          <Text style={s.statValue}>{stats.totalSessions}</Text>
          <Text style={s.statSub}>Distinct active sessions recorded</Text>
        </View>

        <View style={s.statBox}>
          <Text style={s.statLabel}>Engagement Score</Text>
          <Text style={s.statValue}>
            {stats.engagementScore}
            <Text style={s.statUnit}>%</Text>
          </Text>
          <Text style={s.statSub}>Active time ÷ session duration</Text>
        </View>
      </View>

      <Text style={s.summaryNote}>
        All metrics are derived from timestamped activity events recorded every
        30 seconds during study sessions. A session is defined as a continuous
        block of activity with no gap exceeding 5 minutes. "Active time" counts
        only windows where mouse movement or keyboard input was detected.
      </Text>

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Page 3+ — Session Log Table
// ---------------------------------------------------------------------------

function SessionLogPage({
  sessions,
  generatedAt,
}: {
  sessions: SessionRow[];
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>Session Log</Text>
      <Text
        style={{
          fontSize: 8,
          color: "#555",
          marginBottom: 10,
        }}
      >
        All recorded study sessions, sorted newest first. Active Time = 30-second
        windows where mouse or keyboard input was detected.
      </Text>

      {/* Header (fixed = repeats on overflow pages) */}
      <View style={s.tableHeaderRow} fixed>
        <Text style={[s.th, s.colDate]}>Date</Text>
        <Text style={[s.th, s.colTime]}>Start</Text>
        <Text style={[s.th, s.colDur]}>Duration</Text>
        <Text style={[s.th, s.colActive]}>Active Time</Text>
        <Text style={[s.th, s.colMouse]}>Mouse</Text>
        <Text style={[s.th, s.colKeyboard]}>Keyboard</Text>
        <Text style={[s.th, s.colQ]}>Questions</Text>
      </View>

      {sessions.map((row, i) => (
        <View
          key={i}
          style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
          wrap={false}
        >
          <Text style={[s.td, s.colDate]}>{row.date}</Text>
          <Text style={[s.td, s.colTime]}>{row.startTime}</Text>
          <Text style={[s.td, s.colDur]}>{row.duration}</Text>
          <Text style={[s.td, s.colActive]}>{row.activeMinutes}</Text>
          <Text style={[s.td, s.colMouse]}>{row.mouseEvents}</Text>
          <Text style={[s.td, s.colKeyboard]}>{row.keyboardEvents}</Text>
          <Text style={[s.td, s.colQ]}>{row.questions}</Text>
        </View>
      ))}

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline — 5 most recent sessions
// ---------------------------------------------------------------------------

function ActivityTimelinePage({
  sessions,
  generatedAt,
}: {
  sessions: RecentSessionActivity[];
  generatedAt: string;
}) {
  if (sessions.length === 0) return null;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>Activity Timeline</Text>
      <Text style={{ fontSize: 8, color: "#555", marginBottom: 12 }}>
        Detailed activity patterns for the {sessions.length} most recent study
        sessions. Active intervals are continuous blocks of recorded input;
        idle intervals are pauses where no input was detected within the session.
      </Text>

      {sessions.map((session, i) => (
        <View key={i} style={s.sessionBlock} wrap={false}>
          <Text style={s.sessionBlockHead}>
            {session.date} · {session.startTime} · {session.duration}
          </Text>
          <Text style={s.sessionBlockLine}>
            Activity pattern:{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {session.activeIntervals} active interval
              {session.activeIntervals !== 1 ? "s" : ""}
            </Text>
            ,{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>
              {session.idleIntervals} idle interval
              {session.idleIntervals !== 1 ? "s" : ""}
            </Text>
          </Text>
          {session.topics.length > 0 && (
            <Text style={s.sessionTopics}>
              Topics: {session.topics.join(" · ")}
            </Text>
          )}
        </View>
      ))}

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Topic Coverage Table
// ---------------------------------------------------------------------------

function TopicCoveragePage({
  topics,
  generatedAt,
}: {
  topics: TopicRow[];
  generatedAt: string;
}) {
  const covered = topics.filter((t) => t.mentions > 0).length;

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>Topic Coverage</Text>
      <Text style={{ fontSize: 8, color: "#555", marginBottom: 10 }}>
        All 12 H2 Economics topics (SEAB syllabus 9570). {covered} of 12
        topics covered. Status: Not Started = 0 mentions, Weak = 1–5, Developing
        = 6–15, Strong = 16+.
      </Text>

      <View style={s.tableHeaderRow} fixed>
        <Text style={[s.th, s.colTopic]}>Topic</Text>
        <Text style={[s.th, s.colCat]}>Category</Text>
        <Text style={[s.th, s.colMentions]}>Mentions</Text>
        <Text style={[s.th, s.colConvs]}>Convs</Text>
        <Text style={[s.th, s.colStatus]}>Status</Text>
      </View>

      {topics.map((row, i) => (
        <View
          key={i}
          style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}
          wrap={false}
        >
          <Text style={[s.td, s.colTopic]}>{row.label}</Text>
          <Text style={[s.td, s.colCat]}>{row.category}</Text>
          <Text style={[s.td, s.colMentions]}>{row.mentions}</Text>
          <Text style={[s.td, s.colConvs]}>{row.conversations}</Text>
          <Text
            style={[
              s.td,
              s.colStatus,
              {
                fontFamily:
                  row.status === "Not Started"
                    ? "Helvetica"
                    : "Helvetica-Bold",
                color:
                  row.status === "Not Started"
                    ? "#999"
                    : row.status === "Weak"
                    ? "#000"
                    : row.status === "Developing"
                    ? "#000"
                    : "#000",
              },
            ]}
          >
            {row.status}
          </Text>
        </View>
      ))}

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Engagement Analysis (Final Page)
// ---------------------------------------------------------------------------

function EngagementPage({
  stats,
  totalActiveMinutes,
  totalSessionMinutes,
  studentEmail,
  generatedAt,
}: {
  stats: ReportData["stats"];
  totalActiveMinutes: number;
  totalSessionMinutes: number;
  studentEmail: string;
  generatedAt: string;
}) {
  const pct = Math.min(100, stats.engagementScore);
  const activeHours = (totalActiveMinutes / 60).toFixed(1);
  const sessionHours = (totalSessionMinutes / 60).toFixed(1);
  const idleMinutes = Math.max(0, totalSessionMinutes - totalActiveMinutes);

  return (
    <Page size="A4" style={s.page}>
      <Text style={s.sectionTitle}>Engagement Analysis</Text>

      {/* Bar chart */}
      <Text style={{ fontSize: 8, color: "#555", marginBottom: 6 }}>
        Active vs. Idle Time (proportion of total session time)
      </Text>
      <View style={s.engagementBar}>
        <View style={[s.engagementFill, { width: `${pct}%` }]} />
        <View style={[s.engagementEmpty, { width: `${100 - pct}%` }]} />
      </View>
      <View style={s.engagementLabel}>
        <Text style={s.engagementLabelText}>
          Active: {activeHours}h ({pct}%)
        </Text>
        <Text style={s.engagementLabelText}>
          Idle: {(idleMinutes / 60).toFixed(1)}h ({100 - pct}%)
        </Text>
        <Text style={s.engagementLabelText}>
          Total session time: {sessionHours}h
        </Text>
      </View>

      {/* Breakdown table */}
      <View style={[s.tableHeaderRow, { marginBottom: 0 }]}>
        <Text style={[s.th, { flex: 3 }]}>Metric</Text>
        <Text style={[s.th, { flex: 1.5 }]}>Value</Text>
      </View>
      {[
        ["Total study sessions", `${stats.totalSessions}`],
        ["Total session time", `${sessionHours} hours`],
        ["Total active time (mouse/keyboard input)", `${activeHours} hours`],
        ["Total idle time within sessions", `${(idleMinutes / 60).toFixed(1)} hours`],
        ["Engagement score (active ÷ total)", `${pct}%`],
        ["Consecutive study streak", `${stats.streakDays} days`],
        ["Questions asked to AI tutor", `${stats.totalMessages}`],
        ["H2 Economics topics covered", `${stats.topicsCovered} of 12`],
      ].map(([label, value], i) => (
        <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
          <Text style={[s.td, { flex: 3 }]}>{label}</Text>
          <Text style={[s.td, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>
            {value}
          </Text>
        </View>
      ))}

      {/* Official statement */}
      <View style={[s.engagementStatement, { marginTop: 16 }]}>
        <Text>
          {`Activity patterns for ${studentEmail} demonstrate genuine, sustained engagement with academic study material. ` +
            `Mouse movement and keyboard input were recorded during ${pct}% of total session time ` +
            `(${activeHours} active hours out of ${sessionHours} total session hours across ${stats.totalSessions} recorded sessions). ` +
            `All activity data is timestamped and collected automatically at 30-second intervals by the Socratic.sg platform. ` +
            `Data cannot be fabricated post-hoc, as it requires live browser interaction to generate.`}
        </Text>
      </View>

      {/* Signature block */}
      <View style={s.signatureBlock}>
        <View style={s.signatureLine}>
          <Text style={s.signatureLabel}>Authorised by Platform</Text>
        </View>
        <View style={s.signatureLine}>
          <Text style={s.signatureLabel}>Date of Report</Text>
        </View>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Root Document
// ---------------------------------------------------------------------------

export function ProbationReport(data: ReportData) {
  return (
    <Document
      title="Socratic.sg Study Activity Report"
      author="Socratic.sg"
      subject={`Study activity report for ${data.studentEmail}`}
    >
      <CoverPage
        studentEmail={data.studentEmail}
        dateFrom={data.dateFrom}
        dateTo={data.dateTo}
        generatedAt={data.generatedAt}
      />
      <SummaryPage stats={data.stats} generatedAt={data.generatedAt} />
      <SessionLogPage sessions={data.sessions} generatedAt={data.generatedAt} />
      <ActivityTimelinePage
        sessions={data.recentSessionActivity}
        generatedAt={data.generatedAt}
      />
      <TopicCoveragePage topics={data.topics} generatedAt={data.generatedAt} />
      <EngagementPage
        stats={data.stats}
        totalActiveMinutes={data.totalActiveMinutes}
        totalSessionMinutes={data.totalSessionMinutes}
        studentEmail={data.studentEmail}
        generatedAt={data.generatedAt}
      />
    </Document>
  );
}
