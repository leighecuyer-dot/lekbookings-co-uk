import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/contexts/BusinessContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, isWithinInterval } from "date-fns";
import { BarChart3, TrendingUp, Users, MessageSquare, Target, Calendar, DollarSign, Percent } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  message_template: string;
  target_audience: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  recipient_customer_ids: string[];
  sent_at: string;
  created_at: string;
}

interface CampaignConversion {
  id: string;
  campaign_id: string;
  customer_id: string;
  booking_id: string;
  booking_value: number | null;
  converted_at: string;
}

export default function CampaignsReportPage() {
  const { currentBusiness } = useBusiness();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["campaigns", currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("business_id", currentBusiness.id)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!currentBusiness?.id,
  });

  // Fetch conversions
  const { data: conversions = [], isLoading: conversionsLoading } = useQuery({
    queryKey: ["campaign_conversions", currentBusiness?.id],
    queryFn: async () => {
      if (!currentBusiness?.id || campaigns.length === 0) return [];
      const campaignIds = campaigns.map(c => c.id);
      const { data, error } = await supabase
        .from("campaign_conversions")
        .select("*")
        .in("campaign_id", campaignIds);
      if (error) throw error;
      return data as CampaignConversion[];
    },
    enabled: !!currentBusiness?.id && campaigns.length > 0,
  });

  // Calculate metrics
  const calculateCampaignMetrics = (campaign: Campaign) => {
    const campaignConversions = conversions.filter(c => c.campaign_id === campaign.id);
    const conversionRate = campaign.sent_count > 0 
      ? (campaignConversions.length / campaign.sent_count) * 100 
      : 0;
    const totalRevenue = campaignConversions.reduce((sum, c) => sum + (c.booking_value || 0), 0);
    const deliveryRate = campaign.recipient_count > 0
      ? (campaign.sent_count / campaign.recipient_count) * 100
      : 0;

    return {
      conversions: campaignConversions.length,
      conversionRate,
      totalRevenue,
      deliveryRate,
    };
  };

  // Overall stats
  const overallStats = {
    totalCampaigns: campaigns.length,
    totalRecipients: campaigns.reduce((sum, c) => sum + c.recipient_count, 0),
    totalConversions: conversions.length,
    totalRevenue: conversions.reduce((sum, c) => sum + (c.booking_value || 0), 0),
    avgConversionRate: campaigns.length > 0
      ? campaigns.reduce((sum, c) => {
          const metrics = calculateCampaignMetrics(c);
          return sum + metrics.conversionRate;
        }, 0) / campaigns.length
      : 0,
  };

  // Recent campaigns (last 30 days)
  const recentCampaigns = campaigns.filter(c => 
    isWithinInterval(new Date(c.sent_at), {
      start: subDays(new Date(), 30),
      end: new Date(),
    })
  );

  const getCampaignTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      whatsapp: "default",
      email: "secondary",
      sms: "outline",
    };
    return <Badge variant={variants[type] || "default"}>{type.toUpperCase()}</Badge>;
  };

  const isLoading = campaignsLoading || conversionsLoading;

  return (
    <DashboardLayout
      title="Campaign Reports"
      description="Track and analyze your marketing campaign performance"
    >
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Campaigns</span>
              </div>
              <p className="text-2xl font-bold mt-1">{overallStats.totalCampaigns}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Recipients</span>
              </div>
              <p className="text-2xl font-bold mt-1">{overallStats.totalRecipients.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Conversions</span>
              </div>
              <p className="text-2xl font-bold mt-1">{overallStats.totalConversions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg. Rate</span>
              </div>
              <p className="text-2xl font-bold mt-1">{overallStats.avgConversionRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Revenue</span>
              </div>
              <p className="text-2xl font-bold mt-1">R{overallStats.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Campaign Performance
            </CardTitle>
            <CardDescription>
              View detailed performance metrics for each campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="recent">Last 30 Days</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
                ) : campaigns.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No campaigns yet"
                    description="Start sending campaigns from the Customers page to see performance data here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">Sent</TableHead>
                          <TableHead className="text-center">Delivered</TableHead>
                          <TableHead className="text-center">Conversions</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => {
                          const metrics = calculateCampaignMetrics(campaign);
                          return (
                            <TableRow key={campaign.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {campaign.name}
                              </TableCell>
                              <TableCell>{getCampaignTypeBadge(campaign.campaign_type)}</TableCell>
                              <TableCell className="text-center">{campaign.recipient_count}</TableCell>
                              <TableCell className="text-center">
                                <span className={campaign.sent_count < campaign.recipient_count ? "text-amber-600" : "text-green-600"}>
                                  {campaign.sent_count}
                                </span>
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({metrics.deliveryRate.toFixed(0)}%)
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{metrics.conversions}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={metrics.conversionRate > 5 ? "default" : "secondary"}>
                                  {metrics.conversionRate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R{metrics.totalRevenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(campaign.sent_at), "dd MMM yyyy")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="recent" className="mt-4">
                {recentCampaigns.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No recent campaigns"
                    description="No campaigns have been sent in the last 30 days."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">Sent</TableHead>
                          <TableHead className="text-center">Delivered</TableHead>
                          <TableHead className="text-center">Conversions</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentCampaigns.map((campaign) => {
                          const metrics = calculateCampaignMetrics(campaign);
                          return (
                            <TableRow key={campaign.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {campaign.name}
                              </TableCell>
                              <TableCell>{getCampaignTypeBadge(campaign.campaign_type)}</TableCell>
                              <TableCell className="text-center">{campaign.recipient_count}</TableCell>
                              <TableCell className="text-center">
                                <span className={campaign.sent_count < campaign.recipient_count ? "text-amber-600" : "text-green-600"}>
                                  {campaign.sent_count}
                                </span>
                                <span className="text-muted-foreground text-xs ml-1">
                                  ({metrics.deliveryRate.toFixed(0)}%)
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{metrics.conversions}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={metrics.conversionRate > 5 ? "default" : "secondary"}>
                                  {metrics.conversionRate.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                R{metrics.totalRevenue.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(campaign.sent_at), "dd MMM yyyy")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Attribution Note */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">How conversions are tracked</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A conversion is counted when a customer who received a campaign message makes a booking 
                  within 7 days. The booking value is attributed to the most recent campaign they received.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
