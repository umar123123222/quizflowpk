-- Remove both duplicate submissions for the student who attempted twice
DELETE FROM submissions WHERE id IN (
  '1733501f-93c5-4136-8f24-84c92f414fc3',
  '80c8c6eb-81c2-4c78-bddc-e7e3ccbaa8e3'
);

-- Remove both student records
DELETE FROM students WHERE id IN (
  'eed62e77-76c1-469e-904e-eeb950454c74',
  '97b3a64e-4142-4794-bf73-9690574110b8'
);