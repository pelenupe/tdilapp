import { useEffect, useState } from 'react';
import { getMembers } from '../services/profileService';

export default function Directory() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await getMembers();
      setMembers(data);
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Member Directory</h1>
      <div className="grid gap-4">
        {members.map((member) => (
          <div key={member.id} className="p-4 border rounded">
            <h2 className="font-bold">{member.name}</h2>
            <p>{member.bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
