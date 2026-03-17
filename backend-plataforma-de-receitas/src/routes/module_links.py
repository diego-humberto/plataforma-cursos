from flask import Blueprint, request, jsonify

from app import db, ModuleLink

bp = Blueprint('module_links', __name__)


@bp.route('/api/courses/<int:course_id>/module-links', methods=['GET'])
def get_module_links(course_id):
    links = ModuleLink.query.filter_by(course_id=course_id).all()
    result = {}
    for link in links:
        if link.module_name not in result:
            result[link.module_name] = []
        result[link.module_name].append({
            'id': link.id,
            'label': link.label or 'Questoes',
            'url': link.questions_url,
        })
    return jsonify(result)


@bp.route('/api/courses/<int:course_id>/module-links', methods=['POST'])
def create_module_link(course_id):
    data = request.get_json()
    module_name = data.get('module_name', '').strip()
    label = data.get('label', 'Questoes').strip()
    url = data.get('url', '').strip()

    if not module_name or not url:
        return jsonify({'error': 'module_name and url are required'}), 400

    new_link = ModuleLink(course_id=course_id, module_name=module_name, label=label, questions_url=url)
    db.session.add(new_link)
    db.session.commit()
    return jsonify({'id': new_link.id, 'label': new_link.label, 'url': new_link.questions_url}), 201


@bp.route('/api/module-links/<int:link_id>', methods=['PUT'])
def update_module_link(link_id):
    link = ModuleLink.query.get_or_404(link_id)
    data = request.get_json()
    label = data.get('label', '').strip()
    url = data.get('url', '').strip()

    if label:
        link.label = label
    if url:
        link.questions_url = url

    db.session.commit()
    return jsonify({'id': link.id, 'label': link.label, 'url': link.questions_url})


@bp.route('/api/module-links/<int:link_id>', methods=['DELETE'])
def delete_module_link(link_id):
    link = ModuleLink.query.get_or_404(link_id)
    db.session.delete(link)
    db.session.commit()
    return jsonify({'status': 'deleted'})


@bp.route('/api/module-link-labels', methods=['GET'])
def get_distinct_module_link_labels():
    rows = db.session.query(db.distinct(ModuleLink.label)).all()
    labels = sorted([row[0] for row in rows if row[0]])
    return jsonify(labels)
