import { useState } from "react";

const mockMembers = [
  {
    id: 1,
    name: "Jane Doe",
    role: "Student",
    skills: ["React", "Node.js", "SQL"],
    imageUrl: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: 2,
    name: "John Smith",
    role: "Alumni",
    skills: ["Python", "Django", "AWS"],
    imageUrl: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: 3,
    name: "Emily Chen",
    role: "Employer",
    skills: ["Hiring", "Project Management"],
    imageUrl: "https://i.pravatar.cc/150?img=3",
  },
];

export default function Directory() {
  console.log(mockMembers); // 👈🏼 debug line

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-extrabold text-center text-blue-700 mb-10">
        Member Directory
      </h1>
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center transition-transform transform hover:-translate-y-1 hover:shadow-lg"
          >
            <img
              src={member.imageUrl}
              alt={member.name}
              className="rounded-full w-24 h-24 mb-4 object-cover"
            />
            <h2 className="text-2xl font-semibold text-gray-800">{member.name}</h2>
            <p className="text-gray-500 mb-3">{member.role}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
            <button className="mt-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-5 rounded-full transition-colors duration-300">
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
