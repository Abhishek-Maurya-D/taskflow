import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

export default function UsersPage() {
  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ id: userId, data: { role: newRole as "admin" | "member" } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Team Members</h2>
        <p className="text-muted-foreground text-sm">{users?.length ?? 0} members</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !users?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No team members yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(member => (
            <Card key={member.id}>
              <CardContent className="flex items-center justify-between py-3 px-5">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profileImageUrl ?? undefined} />
                    <AvatarFallback>
                      {(member.firstName?.[0] || member.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email ?? "Unknown user"}
                      {member.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.id === currentUser?.id ? (
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={val => handleRoleChange(member.id, val)}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
