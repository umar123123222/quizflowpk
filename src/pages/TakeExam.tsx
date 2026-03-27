import { useParams } from "react-router-dom";

const TakeExam = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold">Exam</h1>
        <p className="text-muted-foreground font-mono text-sm">Exam ID: {id}</p>
        <p className="text-muted-foreground text-sm">This page will be built out soon.</p>
      </div>
    </div>
  );
};

export default TakeExam;
