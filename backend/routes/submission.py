from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.submission import Submission
from app.models.task import Task
from app.services.logging_service import log_activity

submission_bp = Blueprint('submission_bp', __name__)
 
@submission_bp.route('/api/submissions', methods=['POST'])
@jwt_required()



def submit_work():

    current_user_id = get_jwt_identity()

    data = request.get_json()

    task_id = data.get('task_id')
    file_url = data.get('file_url')
    description = data.get('description')

    if not task_id:
        return jsonify({
            'error': 'task_id is required'
        }), 400

    task = Task.query.get(task_id)

    if not task:
        return jsonify({
            'error': 'Task not found'
        }), 404
    
     # verify ownership
    if task.assigned_user_id != current_user_id:
        return jsonify({
            'error': 'You are not assigned to this task'
        }), 403

    submission = Submission(
        task_id=task_id,
        user_id=current_user_id,
        file_url=file_url,
        description=description
    )

    db.session.add(submission)

     # automatically update task status
    task.status = 'Completed'

    db.session.commit()

    # create activity log
    log_activity(
        current_user_id,
        f'Submitted work for task {task_id}'
    )

    return jsonify({
        'message': 'Work submitted successfully'
    }), 201

@submission_bp.route('/api/submissions/<int:task_id>', methods=['GET'])
@jwt_required()
def get_submissions(task_id):

    submissions = Submission.query.filter_by(
        task_id=task_id
    ).all()

    results = []

    for submission in submissions:
        results.append({
            'submission_id': submission.submission_id,
            'task_id': submission.task_id,
            'user_id': submission.user_id,
            'file_url': submission.file_url,
            'description': submission.description,
            'submitted_at': submission.submitted_at
        })

    return jsonify(results), 200