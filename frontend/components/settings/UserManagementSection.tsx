import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Users, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  addUserToOrganization,
  removeUserFromOrganization,
  updateOrganizationUser,
  type Organization,
  type OrganizationUser,
} from "@/lib/organization-api";
import { AddUserDialog } from "./dialogs/AddUserDialog";
import { EditUserDialog } from "./dialogs/EditUserDialog";
import { DeleteUserDialog } from "./dialogs/DeleteUserDialog";
import type { UserProfile } from "./types";

interface UserManagementSectionProps {
  organization: Organization;
  organizationUsers: OrganizationUser[];
  currentUser: UserProfile;
  token: string;
  onUsersUpdate: (users: OrganizationUser[]) => void;
  onOrganizationUpdate: (org: Organization) => void;
}

export function UserManagementSection({
  organization,
  organizationUsers,
  currentUser,
  token,
  onUsersUpdate,
  onOrganizationUpdate,
}: UserManagementSectionProps) {
  const router = useRouter();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<OrganizationUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const canAddMoreUsers = () => {
    return (
      organization.planSettings.maxUsers === -1 ||
      (organization.currentUsers || 0) < organization.planSettings.maxUsers
    );
  };

  const handleAddUser = async (email: string, language: string) => {
    setIsAddingUser(true);
    try {
      const newUser = await addUserToOrganization(token, { email, language });
      onUsersUpdate([...organizationUsers, newUser]);
      setShowAddUserDialog(false);
      toast.success("User invited successfully. An invitation email has been sent.");
      
      // Refresh organization data
      const { getMyOrganization } = await import("@/lib/organization-api");
      const updatedOrg = await getMyOrganization(token);
      onOrganizationUpdate(updatedOrg);
    } catch (err: any) {
      console.error("Failed to add user:", err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to add user");
      }
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    setIsEditingUser(true);
    try {
      const updatedUser = await updateOrganizationUser(token, editingUser.id, {
        language: editingUser.language,
      });
      onUsersUpdate(
        organizationUsers.map((u) =>
          u.id === updatedUser.id ? updatedUser : u
        )
      );
      setShowEditUserDialog(false);
      setEditingUser(null);
      toast.success("User language updated successfully");
    } catch (err) {
      console.error("Failed to update user:", err);
      toast.error("Failed to update user");
    } finally {
      setIsEditingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeletingUser(true);
    try {
      await removeUserFromOrganization(token, deletingUser.id);
      
      // Close the dialog and reset state immediately
      setShowDeleteUserDialog(false);
      setDeletingUser(null);
      
      // Show success message
      toast.success("User removed successfully");
      
      // Refresh both organization data and users list
      const { getMyOrganization, getOrganizationUsers } = await import("@/lib/organization-api");
      
      // Update users list from server
      try {
        const updatedUsers = await getOrganizationUsers(token);
        onUsersUpdate(updatedUsers);
      } catch (err) {
        console.error("Failed to refresh users list:", err);
        // Fallback to local update if refresh fails
        const updatedUsers = organizationUsers.filter((u) => u.id !== deletingUser.id);
        onUsersUpdate(updatedUsers);
      }
      
      // Update organization data
      try {
        const updatedOrg = await getMyOrganization(token);
        onOrganizationUpdate(updatedOrg);
      } catch (err) {
        console.error("Failed to refresh organization data:", err);
      }
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to remove user");
      }
      // Still close the dialog on error
      setShowDeleteUserDialog(false);
      setDeletingUser(null);
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
              {!canAddMoreUsers() && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700"
                >
                  Upgrade
                </Badge>
              )}
            </CardTitle>
            <Button
              onClick={() => {
                if (canAddMoreUsers()) {
                  setShowAddUserDialog(true);
                } else {
                  router.push("/update-plan");
                }
              }}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!canAddMoreUsers() && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've reached your user limit. Upgrade your plan to add more users.
              </AlertDescription>
            </Alert>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Last Connection</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizationUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email}
                    {user.id === currentUser.id && (
                      <Badge variant="secondary" className="ml-2">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.language}</TableCell>
                  <TableCell>
                    {user.lastConnectionAt 
                      ? new Date(user.lastConnectionAt).toLocaleDateString() 
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditUserDialog(true);
                        }}
                        disabled={user.id === currentUser.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingUser(user);
                          setShowDeleteUserDialog(true);
                        }}
                        disabled={user.id === currentUser.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddUserDialog
        open={showAddUserDialog}
        onOpenChange={setShowAddUserDialog}
        onAdd={handleAddUser}
        isLoading={isAddingUser}
      />

      <EditUserDialog
        open={showEditUserDialog}
        onOpenChange={setShowEditUserDialog}
        user={editingUser}
        onUserChange={setEditingUser}
        onSave={handleEditUser}
        isLoading={isEditingUser}
      />

      <DeleteUserDialog
        open={showDeleteUserDialog}
        onOpenChange={setShowDeleteUserDialog}
        userEmail={deletingUser?.email || ""}
        onDelete={handleDeleteUser}
        isLoading={isDeletingUser}
      />
    </>
  );
}