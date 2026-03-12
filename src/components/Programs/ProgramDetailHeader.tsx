// PATH: src/components/Programs/ProgramDetailHeader.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Coins, ArrowLeft } from 'lucide-react';
import Card from '../UI/Card';

type ProgramDetailHeaderProps = {
  program: {
    program_id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    participant_count?: number | null;
    token_allocation?: number | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function statusClasses(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'paused':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
}

export default function ProgramDetailHeader({ program }: ProgramDetailHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link to="/programs" className="hover:text-primary-600">Programs</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 font-medium">{program.name}</span>
      </div>

      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              to="/programs"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Programs
            </Link>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {program.name}
              </h1>

              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusClasses(
                  program.status
                )}`}
              >
                {(program.status || 'active').toUpperCase()}
              </span>
            </div>

            <p className="text-gray-600 max-w-3xl">
              {program.description || 'No program description available.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Calendar className="w-4 h-4" />
                Timeline
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(program.start_date)} — {formatDate(program.end_date)}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                Participants
              </div>
              <div className="text-sm font-medium text-gray-900">
                {program.participant_count ?? 0}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Coins className="w-4 h-4" />
                Token Allocation
              </div>
              <div className="text-sm font-medium text-gray-900">
                {(program.token_allocation ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}