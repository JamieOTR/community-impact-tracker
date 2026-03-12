// PATH: src/pages/programs.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePrograms } from '../hooks/useDatabase';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

function Programs() {
  const navigate = useNavigate();
  const { programs, loading, error, refetch } = usePrograms();

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Programs</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-10">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Unable to Load Programs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </Card>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <h2 className="text-lg font-semibold mb-2">No Programs Available</h2>
          <p className="text-gray-600">
            There are currently no programs available for your community.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Programs</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program, index) => (
          <motion.div
            key={program.program_id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card hover className="h-full flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">{program.name}</h2>

                <p className="text-sm text-gray-600 mb-4">
                  {program.description || 'No description available'}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => navigate(`/programs/${program.program_id}`)}
              >
                View Program
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Programs;