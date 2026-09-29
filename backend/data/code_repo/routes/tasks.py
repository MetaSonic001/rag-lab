"""CRUD routes for tasks. Every route requires authentication."""
from flask import Blueprint, g, jsonify, request

from auth.middleware import require_auth
from db import get_connection

tasks_bp = Blueprint("tasks", __name__)


@tasks_bp.get("/")
@require_auth
def list_tasks():
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM tasks WHERE owner_id = ?", (g.user_id,)).fetchall()
    return jsonify([dict(r) for r in rows])


@tasks_bp.post("/")
@require_auth
def create_task():
    title = request.get_json(force=True)["title"]
    with get_connection() as conn:
        cur = conn.execute("INSERT INTO tasks (owner_id, title) VALUES (?, ?)", (g.user_id, title))
    return jsonify({"id": cur.lastrowid, "title": title}), 201


@tasks_bp.patch("/<int:task_id>/done")
@require_auth
def complete_task(task_id: int):
    with get_connection() as conn:
        conn.execute("UPDATE tasks SET done = 1 WHERE id = ? AND owner_id = ?", (task_id, g.user_id))
    return jsonify({"id": task_id, "done": True})
