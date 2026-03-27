DELETE FROM submissions WHERE exam_id IN (SELECT e.id FROM exams e JOIN profiles p ON e.created_by = p.id WHERE p.role = 'organization_owner');
DELETE FROM questions WHERE exam_id IN (SELECT e.id FROM exams e JOIN profiles p ON e.created_by = p.id WHERE p.role = 'organization_owner');
DELETE FROM exams e USING profiles p WHERE e.created_by = p.id AND p.role = 'organization_owner';