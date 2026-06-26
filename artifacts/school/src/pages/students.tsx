import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function StudentsPage() {
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "admin";
  
  const { data: students } = useListStudents();

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">قائمة الطلاب</h1>
        {isAdmin && <p className="mb-4 text-green-600">أنت مسجل كمدير النظام</p>}
        
        <div className="bg-white shadow rounded-lg p-4">
          {students?.length === 0 ? (
            <p>لا يوجد طلاب حالياً.</p>
          ) : (
            <ul>
              {students?.map((student: any) => (
                <li key={student.id} className="border-b py-2">
                  {student.fullName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
