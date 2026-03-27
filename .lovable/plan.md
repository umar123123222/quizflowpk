

## Plan: Shareable Exam Link with Copy Button

### What happens
After saving an exam, a dialog appears showing a unique shareable link (`/exam/:id`). The link is also visible on each exam card in the exams list. A "Copy" button copies it to clipboard with toast feedback.

### Changes

**1. CreateExam.tsx — Show shareable link dialog after save**
- Add state for `savedExamId` and `showLinkDialog`
- After successful save, instead of immediately navigating, set `savedExamId` to the new exam ID and show a dialog
- Dialog displays the shareable link: `{window.location.origin}/exam/{examId}`
- Include a "Copy Link" button that copies to clipboard and shows a toast
- Include a "Go to Dashboard" button to navigate away

**2. ExamsList.tsx — Add copy link button on each exam card**
- Add a small "Copy Link" icon button next to each exam card's "View / Edit" button
- Clicking copies `{window.location.origin}/exam/{examId}` to clipboard with toast feedback

**3. App.tsx — Add public exam route**
- Add route `/exam/:id` pointing to a new `TakeExam` page (placeholder for now) so the shareable links actually resolve

**4. New page: src/pages/TakeExam.tsx**
- Simple placeholder page that reads the exam ID from URL params and shows "Exam: {id}" — to be built out later

### Technical details
- Uses `navigator.clipboard.writeText()` for copy
- Link format: `{window.location.origin}/exam/{examId}`
- Dialog uses existing `@/components/ui/dialog`
- No database changes needed — uses existing exam `id` (UUID)

