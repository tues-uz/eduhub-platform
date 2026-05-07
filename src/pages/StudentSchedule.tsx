import { Calendar, Clock, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCHEDULE_ITEMS = [
  { id: 1, type: "class", title: "Introduction to Economics – Lesson 8", time: "Mon 10:00 AM", location: "Online" },
  { id: 2, type: "assignment", title: "Economic Analysis Essay", due: "Feb 15, 2025" },
  { id: 3, type: "class", title: "Digital Marketing Essentials – Workshop", time: "Wed 2:00 PM", location: "Online" },
  { id: 4, type: "assignment", title: "Marketing Campaign Proposal", due: "Feb 18, 2025" },
  { id: 5, type: "class", title: "Business Management – Live Q&A", time: "Fri 11:00 AM", location: "Online" },
  { id: 6, type: "assignment", title: "Financial Report Review", due: "Feb 20, 2025" },
];

const StudentSchedule = () => {
  return (
    <div className="container mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-foreground/70 text-sm">Your upcoming classes and assignment deadlines.</p>
            </div>
            <Button variant="outline" className="rounded-full">
              <Calendar className="mr-2 h-4 w-4" />
              View calendar
            </Button>
          </div>
          <div className="space-y-4">
            {SCHEDULE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.type === "class" ? "bg-blue-100" : "bg-purple-100"}`}>
                  {item.type === "class" ? (
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                    {item.title}
                  </h3>
                  {item.type === "class" && "time" in item && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground/60">
                      <Clock className="h-4 w-4" />
                      {item.time} · {item.location}
                    </p>
                  )}
                  {item.type === "assignment" && "due" in item && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground/60">
                      <Calendar className="h-4 w-4" />
                      Due {item.due}
                    </p>
                  )}
                </div>
                <Button size="sm" className="rounded-full flex-shrink-0" style={{ backgroundColor: "#1e40af" }}>
                  {item.type === "class" ? "Join" : "Open"}
                </Button>
              </div>
            ))}
          </div>
    </div>
  );
};

export default StudentSchedule;
