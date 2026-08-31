import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from the project root (one level up from mcp-server/)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

const db = createClient({
  url: (process.env.TURSO_DB_URL ?? process.env.VITE_TURSO_DB_URL)!,
  authToken: (process.env.TURSO_DB_TOKEN ?? process.env.VITE_TURSO_DB_TOKEN)!,
});

const server = new Server(
  { name: 'theball', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_tasks',
      description:
        "Search and filter Matthew's tasks. Use this to answer questions about open work, overdue items, priorities, or what got done on specific dates.",
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['todo', 'done', 'missed', 'all'],
            description: 'Filter by status. "all" returns everything.',
          },
          priority: {
            type: 'string',
            enum: ['p1', 'p2', 'p3', 'all'],
            description: 'P1 = do today, P2 = do this week, P3 = do when ready.',
          },
          category: {
            type: 'string',
            enum: ['work', 'personal', 'all'],
          },
          date_from: {
            type: 'string',
            description: 'Start date inclusive (YYYY-MM-DD)',
          },
          date_to: {
            type: 'string',
            description: 'End date inclusive (YYYY-MM-DD)',
          },
          search: {
            type: 'string',
            description: 'Partial match on task title',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 50)',
          },
        },
      },
    },
    {
      name: 'get_daily_focus',
      description:
        "Get the starred daily focus tasks for a given date — the up to 3 tasks Matthew has pinned as his most important work for that day.",
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date (YYYY-MM-DD). Defaults to today.',
          },
        },
      },
    },
    {
      name: 'get_goals',
      description:
        "Get all of Matthew's goals with their progress percentage, dates, and descriptions.",
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_one_on_ones',
      description:
        "Get 1:1 meeting notes. Each note is a bullet/item from a 1:1 conversation with a specific person.",
      inputSchema: {
        type: 'object',
        properties: {
          person_name: {
            type: 'string',
            description: 'Filter by person name (partial match, e.g. "Roland")',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 40)',
          },
        },
      },
    },
    {
      name: 'search_transcripts',
      description:
        'Search meeting and audio transcripts by title. Returns transcript metadata — call again with get_transcript_detail for full text.',
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Partial match on transcript title',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10)',
          },
        },
      },
    },
    {
      name: 'get_transcript_detail',
      description:
        'Get the full utterances/text of a specific transcript by its ID.',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Transcript ID from search_transcripts' },
        },
      },
    },
    {
      name: 'get_meetings',
      description:
        "Get meeting records from Matthew's meeting spaces (e.g. team standups, 1:1s, architecture reviews). Includes AI-generated insights.",
      inputSchema: {
        type: 'object',
        properties: {
          space_name: {
            type: 'string',
            description: 'Filter by meeting space name (partial match)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 20)',
          },
        },
      },
    },
    {
      name: 'search_knowledge',
      description:
        "Search Matthew's personal knowledge base — notes, articles, documents he's saved across collections like AI, Leadership, Tools, etc.",
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Partial match on title or content',
          },
          collection: {
            type: 'string',
            description: 'Filter by collection name (partial match)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 20)',
          },
        },
      },
    },
    {
      name: 'get_health_summary',
      description:
        "Get recent health data — bloodwork lab results and workout history (runs, bikes, walks, etc.).",
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Max records per category (default 10)',
          },
        },
      },
    },
    {
      name: 'get_week_summary',
      description:
        "Convenience tool: get a complete picture of a given week — tasks (all statuses), daily focus, and meeting records.",
      inputSchema: {
        type: 'object',
        required: ['date_from', 'date_to'],
        properties: {
          date_from: { type: 'string', description: 'Week start (YYYY-MM-DD)' },
          date_to: { type: 'string', description: 'Week end (YYYY-MM-DD)' },
          category: {
            type: 'string',
            enum: ['work', 'personal', 'all'],
            description: 'Default: all',
          },
        },
      },
    },
    {
      name: 'get_knowledge_item',
      description:
        "Get the full content of a specific knowledge document by title. Returns editableContent (user-edited Markdown) if available, otherwise falls back to extracted content. Use this before updating a document.",
      inputSchema: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', description: 'Document title (partial match)' },
        },
      },
    },
    {
      name: 'update_knowledge_item',
      description:
        "Update the content of a knowledge document. Writes to editableContent — the user-edited Markdown field. Use after get_knowledge_item to push improved content back.",
      inputSchema: {
        type: 'object',
        required: ['id', 'content'],
        properties: {
          id: { type: 'string', description: 'Document ID from get_knowledge_item' },
          content: { type: 'string', description: 'New Markdown content to save' },
        },
      },
    },
    {
      name: 'create_command',
      description:
        "Create a new Playbook command (slash command template) in The Ball app. The command will appear in the Commands tab and can be synced to ~/.claude/commands/ from there.",
      inputSchema: {
        type: 'object',
        required: ['name', 'prompt'],
        properties: {
          name: { type: 'string', description: 'Command name (e.g. "Mom Test Review"). Will become the slug /mom-test-review.' },
          description: { type: 'string', description: 'One-line description of what the command does.' },
          prompt: { type: 'string', description: 'The full prompt template. Use {{variable}} for fill-in placeholders.' },
          linked_document_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of knowledge documents to link (optional). Linked doc content is injected when the command runs.',
          },
        },
      },
    },
    {
      name: 'update_command',
      description:
        "Update an existing Playbook command's prompt or description.",
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Command ID from get_commands' },
          name: { type: 'string', description: 'New name (optional)' },
          description: { type: 'string', description: 'New description (optional)' },
          prompt: { type: 'string', description: 'New prompt template (optional)' },
          linked_document_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'New list of linked document IDs (optional, replaces existing)',
          },
        },
      },
    },
    {
      name: 'get_commands',
      description:
        "List all of Matthew's saved Playbook commands — reusable AI prompt templates with optional fill-in variables and linked knowledge documents. Use this to discover what commands exist before running one.",
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Partial match on command name or description (optional)',
          },
        },
      },
    },
    {
      name: 'get_command_with_context',
      description:
        "Fetch a specific Playbook command by ID or name and return its full prompt plus the content of any linked knowledge documents. Use this to execute a command: get the filled template and context, then run it.",
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Command ID (from get_commands)' },
          name: { type: 'string', description: 'Command name (partial match, used if id not provided)' },
          variables: {
            type: 'object',
            description: 'Key-value pairs to fill {{variable}} placeholders in the prompt (e.g. {"audience": "board", "topic": "Q3 results"})',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
  ],
}));

// ─────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── search_tasks ─────────────────────────
      case 'search_tasks': {
        const conditions: string[] = ["taskType = 'calendar'"];
        const params: (string | number)[] = [];

        if (args?.status && args.status !== 'all') {
          conditions.push(`status = ?`);
          params.push(args.status as string);
        }
        if (args?.priority && args.priority !== 'all') {
          conditions.push(`priority = ?`);
          params.push(args.priority as string);
        }
        if (args?.category && args.category !== 'all') {
          conditions.push(`category = ?`);
          params.push(args.category as string);
        }
        if (args?.date_from) {
          conditions.push(`date >= ?`);
          params.push(args.date_from as string);
        }
        if (args?.date_to) {
          conditions.push(`date <= ?`);
          params.push(args.date_to as string);
        }
        if (args?.search) {
          conditions.push(`title LIKE ?`);
          params.push(`%${args.search}%`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const limit = (args?.limit as number) ?? 50;
        const result = await db.execute({
          sql: `SELECT id, title, status, priority, category, date, content, starredDate, starredRank
                FROM tasks ${where}
                ORDER BY date DESC, priority ASC
                LIMIT ?`,
          args: [...params, limit],
        });

        return text(JSON.stringify(result.rows, null, 2));
      }

      // ── get_daily_focus ───────────────────────
      case 'get_daily_focus': {
        const date = (args?.date as string) ?? today();
        const result = await db.execute({
          sql: `SELECT id, title, status, priority, category, starredRank, content
                FROM tasks
                WHERE starredDate = ?
                ORDER BY starredRank ASC`,
          args: [date],
        });
        return text(
          result.rows.length
            ? JSON.stringify(result.rows, null, 2)
            : `No daily focus tasks set for ${date}.`
        );
      }

      // ── get_goals ─────────────────────────────
      case 'get_goals': {
        const result = await db.execute({
          sql: `SELECT id, title, description, progress, startDate, targetDate, color
                FROM goals
                ORDER BY sort_order ASC`,
          args: [],
        });
        return text(JSON.stringify(result.rows, null, 2));
      }

      // ── get_one_on_ones ───────────────────────
      case 'get_one_on_ones': {
        const params: (string | number)[] = [];
        let sql = `SELECT oo.id, oo.content, oo.createdAt, p.name AS person_name
                   FROM one_on_ones oo
                   JOIN one_on_one_people p ON oo.personId = p.id`;
        if (args?.person_name) {
          sql += ` WHERE p.name LIKE ?`;
          params.push(`%${args.person_name}%`);
        }
        sql += ` ORDER BY oo.createdAt DESC LIMIT ?`;
        params.push((args?.limit as number) ?? 40);

        const result = await db.execute({ sql, args: params });
        return text(JSON.stringify(result.rows, null, 2));
      }

      // ── search_transcripts ────────────────────
      case 'search_transcripts': {
        const params: (string | number)[] = [];
        let sql = `SELECT id, title, createdAt, speakerNames FROM transcripts`;
        if (args?.search) {
          sql += ` WHERE title LIKE ?`;
          params.push(`%${args.search}%`);
        }
        sql += ` ORDER BY createdAt DESC LIMIT ?`;
        params.push((args?.limit as number) ?? 10);

        const result = await db.execute({ sql, args: params });
        return text(JSON.stringify(result.rows, null, 2));
      }

      // ── get_transcript_detail ─────────────────
      case 'get_transcript_detail': {
        const result = await db.execute({
          sql: `SELECT id, title, createdAt, speakerNames, utterances FROM transcripts WHERE id = ?`,
          args: [args?.id as string],
        });
        if (!result.rows.length) return text(`Transcript not found: ${args?.id}`);

        const row = result.rows[0] as Record<string, unknown>;
        const parsed = {
          ...row,
          utterances: tryParse(row.utterances as string),
          speakerNames: tryParse(row.speakerNames as string),
        };
        return text(JSON.stringify(parsed, null, 2));
      }

      // ── get_meetings ──────────────────────────
      case 'get_meetings': {
        const params: (string | number)[] = [];
        let sql = `SELECT mr.id, mr.title, mr.date, mr.insight,
                          ms.name AS space_name, ms.category AS space_category
                   FROM meeting_records mr
                   JOIN meeting_spaces ms ON mr.spaceId = ms.id`;
        if (args?.space_name) {
          sql += ` WHERE ms.name LIKE ?`;
          params.push(`%${args.space_name}%`);
        }
        sql += ` ORDER BY mr.date DESC LIMIT ?`;
        params.push((args?.limit as number) ?? 20);

        const result = await db.execute({ sql, args: params });
        const rows = result.rows.map((r) => {
          const row = r as Record<string, unknown>;
          return { ...row, insight: tryParse(row.insight as string) };
        });
        return text(JSON.stringify(rows, null, 2));
      }

      // ── search_knowledge ──────────────────────
      case 'search_knowledge': {
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (args?.search) {
          conditions.push(`(title LIKE ? OR content LIKE ?)`);
          params.push(`%${args.search}%`, `%${args.search}%`);
        }
        if (args?.collection) {
          conditions.push(`collection LIKE ?`);
          params.push(`%${args.collection}%`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.execute({
          sql: `SELECT id, title, type, tags, content, createdAt
                FROM product_knowledge ${where}
                ORDER BY createdAt DESC LIMIT ?`,
          args: [...params, (args?.limit as number) ?? 20],
        });
        return text(JSON.stringify(result.rows, null, 2));
      }

      // ── get_health_summary ────────────────────
      case 'get_health_summary': {
        const limit = (args?.limit as number) ?? 10;
        const [bloodwork, workouts, profile] = await Promise.all([
          db.execute({
            sql: `SELECT id, date, labValues, aiFlags FROM health_bloodwork ORDER BY date DESC LIMIT ?`,
            args: [limit],
          }),
          db.execute({
            sql: `SELECT id, date, type, duration, distance, notes FROM health_workouts ORDER BY date DESC LIMIT ?`,
            args: [limit],
          }),
          db.execute({
            sql: `SELECT dob, sex, weightLbs, heightIn FROM health_profile WHERE id = 'singleton'`,
            args: [],
          }),
        ]);

        return text(JSON.stringify({
          profile: profile.rows[0] ?? null,
          bloodwork: bloodwork.rows.map((r) => {
            const row = r as Record<string, unknown>;
            return { ...row, labValues: tryParse(row.labValues as string), aiFlags: tryParse(row.aiFlags as string) };
          }),
          workouts: workouts.rows,
        }, null, 2));
      }

      // ── get_week_summary ──────────────────────
      case 'get_week_summary': {
        const from = args?.date_from as string;
        const to = args?.date_to as string;
        const cat = (args?.category as string) ?? 'all';

        const taskConditions = [`taskType = 'calendar'`, `date >= ?`, `date <= ?`];
        const taskParams: (string | number)[] = [from, to];
        if (cat !== 'all') {
          taskConditions.push(`category = ?`);
          taskParams.push(cat);
        }

        const [tasks, meetings, focus] = await Promise.all([
          db.execute({
            sql: `SELECT id, title, status, priority, category, date, starredDate, starredRank
                  FROM tasks WHERE ${taskConditions.join(' AND ')}
                  ORDER BY date ASC, priority ASC`,
            args: taskParams,
          }),
          db.execute({
            sql: `SELECT mr.title, mr.date, ms.name AS space_name
                  FROM meeting_records mr
                  JOIN meeting_spaces ms ON mr.spaceId = ms.id
                  WHERE mr.date >= ? AND mr.date <= ?
                  ORDER BY mr.date ASC`,
            args: [from, to],
          }),
          db.execute({
            sql: `SELECT title, status, priority, starredDate, starredRank
                  FROM tasks
                  WHERE starredDate >= ? AND starredDate <= ?
                  ORDER BY starredDate ASC, starredRank ASC`,
            args: [from, to],
          }),
        ]);

        const taskRows = tasks.rows as Record<string, unknown>[];
        return text(JSON.stringify({
          week: `${from} → ${to}`,
          summary: {
            total: taskRows.length,
            done: taskRows.filter((t) => t.status === 'done').length,
            missed: taskRows.filter((t) => t.status === 'missed').length,
            open: taskRows.filter((t) => t.status === 'todo').length,
            p1_open: taskRows.filter((t) => t.priority === 'p1' && t.status === 'todo').length,
          },
          daily_focus: focus.rows,
          tasks: taskRows,
          meetings: meetings.rows,
        }, null, 2));
      }

      // ── get_knowledge_item ────────────────────
      case 'get_knowledge_item': {
        const result = await db.execute({
          sql: `SELECT id, title, type, tags, editableContent, content, createdAt, updatedAt
                FROM product_knowledge
                WHERE title LIKE ?
                ORDER BY updatedAt DESC LIMIT 1`,
          args: [`%${args?.title as string}%`],
        });
        if (!result.rows.length) return text(`No document found matching: ${args?.title}`);
        const row = result.rows[0] as Record<string, unknown>;
        return text(JSON.stringify({
          id: row.id,
          title: row.title,
          type: row.type,
          tags: tryParse(row.tags as string),
          content: (row.editableContent as string) || (row.content as string) || '',
          has_edited_version: !!(row.editableContent),
          updatedAt: row.updatedAt,
        }, null, 2));
      }

      // ── update_knowledge_item ─────────────────
      case 'update_knowledge_item': {
        const now = new Date().toISOString();
        await db.execute({
          sql: `UPDATE product_knowledge SET editableContent = ?, updatedAt = ? WHERE id = ?`,
          args: [args?.content as string, now, args?.id as string],
        });
        return text(`Updated document ${args?.id} at ${now}.`);
      }

      // ── create_command ────────────────────────
      case 'create_command': {
        const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();
        const linkedIds = Array.isArray(args?.linked_document_ids) ? args.linked_document_ids : [];
        await db.execute({
          sql: `INSERT INTO knowledge_commands (id, name, description, prompt, linkedDocumentIds, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            args?.name as string,
            (args?.description as string) || '',
            args?.prompt as string,
            JSON.stringify(linkedIds),
            now,
            now,
          ],
        });
        return text(JSON.stringify({ id, name: args?.name, created: now }, null, 2));
      }

      // ── update_command ────────────────────────
      case 'update_command': {
        const now = new Date().toISOString();
        const current = await db.execute({
          sql: `SELECT name, description, prompt, linkedDocumentIds FROM knowledge_commands WHERE id = ?`,
          args: [args?.id as string],
        });
        if (!current.rows.length) return text(`Command not found: ${args?.id}`);
        const cur = current.rows[0] as Record<string, unknown>;
        const linkedIds = Array.isArray(args?.linked_document_ids)
          ? args.linked_document_ids
          : tryParse(cur.linkedDocumentIds as string);
        await db.execute({
          sql: `UPDATE knowledge_commands SET name = ?, description = ?, prompt = ?, linkedDocumentIds = ?, updatedAt = ? WHERE id = ?`,
          args: [
            (args?.name as string) || (cur.name as string),
            (args?.description as string) !== undefined ? (args?.description as string) : (cur.description as string),
            (args?.prompt as string) || (cur.prompt as string),
            JSON.stringify(Array.isArray(linkedIds) ? linkedIds : []),
            now,
            args?.id as string,
          ],
        });
        return text(`Updated command ${args?.id} at ${now}.`);
      }

      // ── get_commands ──────────────────────────
      case 'get_commands': {
        const params: (string | number)[] = [];
        let sql = `SELECT id, name, description, prompt, linkedDocumentIds, createdAt FROM knowledge_commands`;
        if (args?.search) {
          sql += ` WHERE name LIKE ? OR description LIKE ?`;
          params.push(`%${args.search}%`, `%${args.search}%`);
        }
        sql += ` ORDER BY createdAt DESC`;

        const result = await db.execute({ sql, args: params });
        const rows = result.rows.map((r) => {
          const row = r as Record<string, unknown>;
          const parsed = tryParse(row.linkedDocumentIds as string);
          const linkedDocumentIds: string[] = Array.isArray(parsed) ? parsed : [];
          const vars = extractVariables(row.prompt as string);
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            variables: vars,
            linkedDocumentCount: linkedDocumentIds.length,
            createdAt: row.createdAt,
          };
        });
        return text(rows.length ? JSON.stringify(rows, null, 2) : 'No commands found.');
      }

      // ── get_command_with_context ──────────────
      case 'get_command_with_context': {
        let row: Record<string, unknown> | null = null;

        if (args?.id) {
          const result = await db.execute({
            sql: `SELECT id, name, description, prompt, linkedDocumentIds FROM knowledge_commands WHERE id = ?`,
            args: [args.id as string],
          });
          row = result.rows[0] as Record<string, unknown> ?? null;
        } else if (args?.name) {
          const result = await db.execute({
            sql: `SELECT id, name, description, prompt, linkedDocumentIds FROM knowledge_commands WHERE name LIKE ? LIMIT 1`,
            args: [`%${args.name}%`],
          });
          row = result.rows[0] as Record<string, unknown> ?? null;
        }

        if (!row) return text('Command not found. Use get_commands to list available commands.');

        const parsedIds = tryParse(row.linkedDocumentIds as string);
        const linkedDocumentIds: string[] = Array.isArray(parsedIds) ? parsedIds : [];
        const variables = args?.variables as Record<string, string> | undefined;

        // Fill {{variable}} placeholders
        let filledPrompt = row.prompt as string;
        if (variables) {
          filledPrompt = filledPrompt.replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key.trim()] ?? `{{${key.trim()}}}`);
        }

        // Fetch linked document content
        let docs: { title: string; content: string }[] = [];
        if (linkedDocumentIds.length > 0) {
          const placeholders = linkedDocumentIds.map(() => '?').join(', ');
          const docsResult = await db.execute({
            sql: `SELECT title, editableContent, content FROM product_knowledge WHERE id IN (${placeholders})`,
            args: linkedDocumentIds,
          });
          docs = docsResult.rows.map((r) => {
            const dr = r as Record<string, unknown>;
            return { title: dr.title as string, content: (dr.editableContent as string) || (dr.content as string) || '' };
          });
        }

        const unfilled = extractVariables(filledPrompt);

        return text(JSON.stringify({
          id: row.id,
          name: row.name,
          description: row.description,
          prompt: filledPrompt,
          unfilled_variables: unfilled.length > 0 ? unfilled : undefined,
          linked_documents: docs,
        }, null, 2));
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
      isError: true,
    };
  }
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function text(t: string) {
  return { content: [{ type: 'text' as const, text: t }] };
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function tryParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
}

// ─────────────────────────────────────────────
// SCHEMA MIGRATIONS
// ─────────────────────────────────────────────
async function ensureSchema() {
  try { await db.execute("ALTER TABLE product_knowledge ADD COLUMN editableContent TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE product_knowledge ADD COLUMN collection TEXT"); } catch (_) {}
}
await ensureSchema();

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
