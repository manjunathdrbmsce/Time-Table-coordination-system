"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DoorOpen, 
  Loader2, 
  RefreshCw, 
  ArrowLeftRight,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

interface SlotRequest {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  requester: { name: string; email: string };
  room: { code: string; logicalName: string; actualName?: string | null; department?: { code: string } };
  section: {
    year: number;
    division: string;
    department: { code: string };
  };
}

interface AllocationInfo {
  id: string;
  day: string;
  startTime: string;
  subject: string;
  faculty: string;
  type: string;
  room: {
    code: string;
    logicalName: string;
    actualName: string | null;
    type: string;
    capacity: number;
    department?: { code: string; name: string } | null;
  };
  section: {
    year: number;
    division: string;
    department: { code: string; name: string };
  };
  linkedSubject?: { code: string; name: string; shortName?: string } | null;
}

interface ExchangeRequest {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  requester: { name: string; email: string };
  responder?: { name: string; email: string } | null;
  responseComment?: string | null;
  respondedAt?: string | null;
  sourceAllocation: AllocationInfo;
  targetAllocation: AllocationInfo;
}

export default function CoordinatorApprovalsPage() {
  const [incomingSlotRequests, setIncomingSlotRequests] = useState<SlotRequest[]>([]);
  const [outgoingSlotRequests, setOutgoingSlotRequests] = useState<SlotRequest[]>([]);
  const [incomingExchanges, setIncomingExchanges] = useState<ExchangeRequest[]>([]);
  const [outgoingExchanges, setOutgoingExchanges] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [incomingSlotRes, outgoingSlotRes, incomingExchangeRes, outgoingExchangeRes] = await Promise.all([
        fetch("/api/coordinator/approvals/incoming"),
        fetch("/api/coordinator/slot-requests"),
        fetch("/api/coordinator/exchange-requests/incoming"),
        fetch("/api/coordinator/exchange-requests"),
      ]);

      if (incomingSlotRes.ok) {
        setIncomingSlotRequests(await incomingSlotRes.json());
      }
      if (outgoingSlotRes.ok) {
        setOutgoingSlotRequests(await outgoingSlotRes.json());
      }
      if (incomingExchangeRes.ok) {
        setIncomingExchanges(await incomingExchangeRes.json());
      }
      if (outgoingExchangeRes.ok) {
        setOutgoingExchanges(await outgoingExchangeRes.json());
      }
    } catch (error) {
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSlotApproval = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/coordinator/approvals/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          decision: action === "approve" ? "APPROVED" : "REJECTED" 
        }),
      });

      if (res.ok) {
        toast.success(`Request ${action === "approve" ? "approved" : "rejected"} successfully`);
        fetchRequests();
      } else {
        const error = await res.json();
        toast.error(error.error || error.message || `Failed to ${action} request`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExchangeApproval = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/coordinator/exchange-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          decision: action === "approve" ? "APPROVED" : "REJECTED" 
        }),
      });

      if (res.ok) {
        toast.success(
          action === "approve" 
            ? "Exchange approved! Rooms have been swapped." 
            : "Exchange request rejected"
        );
        fetchRequests();
      } else {
        const error = await res.json();
        toast.error(error.error || `Failed to ${action} exchange`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} exchange`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelExchange = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/coordinator/exchange-requests/${requestId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Exchange request cancelled");
        fetchRequests();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to cancel exchange");
      }
    } catch (error) {
      toast.error("Failed to cancel exchange");
    } finally {
      setProcessingId(null);
    }
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground">
            Review incoming requests and track your outgoing requests
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="slot-requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="slot-requests" className="gap-2">
            <DoorOpen className="w-4 h-4" />
            Slot Requests
            {(incomingSlotRequests.length > 0 || outgoingSlotRequests.filter(r => r.status === "PENDING").length > 0) && (
              <Badge variant="secondary" className="ml-1">
                {incomingSlotRequests.length + outgoingSlotRequests.filter(r => r.status === "PENDING").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exchanges" className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Exchange Requests
            {(incomingExchanges.length > 0 || outgoingExchanges.filter(r => r.status === "PENDING").length > 0) && (
              <Badge variant="secondary" className="ml-1">
                {incomingExchanges.length + outgoingExchanges.filter(r => r.status === "PENDING").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Slot Requests Tab */}
        <TabsContent value="slot-requests">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Incoming Slot Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Incoming Requests
                  {incomingSlotRequests.length > 0 && (
                    <Badge variant="destructive">{incomingSlotRequests.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Requests for slots in your department&apos;s rooms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomingSlotRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No pending requests
                  </p>
                ) : (
                  incomingSlotRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{request.requester.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.requester.email}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Room:</strong> {request.room.actualName || request.room.logicalName} ({request.room.code})
                        </p>
                        <p>
                          <strong>For:</strong> {request.section.department.code} Sem {request.section.year} Sec {request.section.division}
                        </p>
                        <p>
                          <strong>Slot:</strong> {request.day} - {request.startTime}
                        </p>
                        <p>
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleSlotApproval(request.id, "approve")}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleSlotApproval(request.id, "reject")}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-1" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Outgoing Slot Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  My Slot Requests
                </CardTitle>
                <CardDescription>
                  Your slot requests to other departments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {outgoingSlotRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No requests made yet
                  </p>
                ) : (
                  outgoingSlotRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {request.room.actualName || request.room.logicalName} ({request.room.department?.code})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.day} - {request.startTime}
                        </p>
                      </div>
                      <Badge variant={statusColors[request.status]}>
                        {request.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Exchange Requests Tab */}
        <TabsContent value="exchanges">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Incoming Exchange Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Incoming Exchange Requests
                  {incomingExchanges.length > 0 && (
                    <Badge variant="destructive">{incomingExchanges.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Other departments want to exchange rooms with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomingExchanges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No pending exchange requests
                  </p>
                ) : (
                  incomingExchanges.map((exchange) => (
                    <ExchangeRequestCard
                      key={exchange.id}
                      exchange={exchange}
                      type="incoming"
                      processingId={processingId}
                      onApprove={() => handleExchangeApproval(exchange.id, "approve")}
                      onReject={() => handleExchangeApproval(exchange.id, "reject")}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Outgoing Exchange Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5" />
                  My Exchange Requests
                </CardTitle>
                <CardDescription>
                  Your exchange requests to other departments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {outgoingExchanges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No exchange requests made yet
                  </p>
                ) : (
                  outgoingExchanges.map((exchange) => (
                    <ExchangeRequestCard
                      key={exchange.id}
                      exchange={exchange}
                      type="outgoing"
                      processingId={processingId}
                      onCancel={() => handleCancelExchange(exchange.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Exchange Request Card Component
function ExchangeRequestCard({
  exchange,
  type,
  processingId,
  onApprove,
  onReject,
  onCancel,
}: {
  exchange: ExchangeRequest;
  type: "incoming" | "outgoing";
  processingId: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
    PENDING: "secondary",
    APPROVED: "default",
    REJECTED: "destructive",
  };

  const isProcessing = processingId === exchange.id;

  return (
    <div className="p-4 border rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {type === "incoming" ? (
            <>
              <p className="font-medium">{exchange.requester.name}</p>
              <p className="text-sm text-muted-foreground">{exchange.requester.email}</p>
            </>
          ) : (
            <p className="font-medium">Exchange Request</p>
          )}
        </div>
        <Badge variant={statusColors[exchange.status]}>
          {exchange.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
          {exchange.status === "APPROVED" && <CheckCircle className="w-3 h-3 mr-1" />}
          {exchange.status === "REJECTED" && <XCircle className="w-3 h-3 mr-1" />}
          {exchange.status}
        </Badge>
      </div>

      {/* Exchange Details */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {/* Source (Their slot for incoming, Your slot for outgoing) */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
          <p className="font-medium text-xs text-muted-foreground">
            {type === "incoming" ? "Their Room" : "Your Room"}
          </p>
          <p className="font-semibold">
            {exchange.sourceAllocation.room.actualName || exchange.sourceAllocation.room.logicalName}
          </p>
          <p className="text-xs text-muted-foreground">
            {exchange.sourceAllocation.room.code}
          </p>
          <div className="flex items-center gap-1 text-xs">
            <GraduationCap className="w-3 h-3" />
            {exchange.sourceAllocation.section.department.code} {exchange.sourceAllocation.section.year}
            {exchange.sourceAllocation.section.division}
          </div>
        </div>

        {/* Arrow */}
        <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />

        {/* Target (Your slot for incoming, Their slot for outgoing) */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
          <p className="font-medium text-xs text-muted-foreground">
            {type === "incoming" ? "Your Room" : "Want"}
          </p>
          <p className="font-semibold">
            {exchange.targetAllocation.room.actualName || exchange.targetAllocation.room.logicalName}
          </p>
          <p className="text-xs text-muted-foreground">
            {exchange.targetAllocation.room.code}
          </p>
          <div className="flex items-center gap-1 text-xs">
            <GraduationCap className="w-3 h-3" />
            {exchange.targetAllocation.section.department.code} {exchange.targetAllocation.section.year}
            {exchange.targetAllocation.section.division}
          </div>
        </div>
      </div>

      {/* Slot Info */}
      <div className="text-sm">
        <p>
          <strong>Slot:</strong> {exchange.sourceAllocation.day} - {exchange.sourceAllocation.startTime}
        </p>
        <p>
          <strong>Reason:</strong> {exchange.reason}
        </p>
      </div>

      {/* Response Comment */}
      {exchange.responseComment && (
        <div className="text-sm p-2 bg-muted rounded">
          <strong>Response:</strong> {exchange.responseComment}
        </div>
      )}

      {/* Actions */}
      {exchange.status === "PENDING" && (
        <div className="flex gap-2">
          {type === "incoming" ? (
            <>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Approve Exchange
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                className="flex-1"
                onClick={onReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                Reject
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onCancel}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              Cancel Request
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
