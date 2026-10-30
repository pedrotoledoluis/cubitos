using Cubitos.Publisher.Dashboard.Core.Navigation;

namespace Cubitos.Publisher.Dashboard.Tests;

public class NotchStateMachineTests
{
    private static TimeSpan Ms(int ms) => TimeSpan.FromMilliseconds(ms);

    /// <summary>Runs the frame loop from <paramref name="from"/> to <paramref name="to"/> at ~60 fps.</summary>
    private static void Run(NotchStateMachine notch, int from, int to, bool overNotch = false, bool overPanel = false,
        bool popupOpen = false, bool buttonDown = false)
    {
        for (var t = from; t <= to; t += 16)
        {
            notch.Track(Ms(t), overNotch, overPanel, popupOpen, buttonDown);
            notch.Advance(Ms(t), 0.016);
        }
    }

    [Fact]
    public void Starts_collapsed_or_pinned()
    {
        Assert.Equal(NotchState.Collapsed, new NotchStateMachine().State);
        var pinned = new NotchStateMachine(pinned: true);
        Assert.Equal(NotchState.Pinned, pinned.State);
        Assert.Equal(1, pinned.Open, 6);
    }

    [Fact]
    public void Hover_expands_and_exit_collapses_only_after_the_delay()
    {
        var notch = new NotchStateMachine();
        Assert.True(notch.PointerEntered(Ms(0)));
        Assert.Equal(NotchState.Expanded, notch.State);

        notch.PointerExited(Ms(1000));
        notch.Advance(Ms(1000 + 499), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);

        notch.Advance(Ms(1000 + 500), 0.016);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Reentering_before_the_delay_cancels_the_collapse()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.PointerExited(Ms(100));
        Assert.False(notch.PointerEntered(Ms(400)));
        notch.Advance(Ms(2000), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);
        Assert.Null(notch.CollapseAt);
    }

    [Fact]
    public void Moving_from_the_notch_into_the_open_panel_keeps_it_open()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overNotch: true);
        Assert.Equal(NotchState.Expanded, notch.State);

        Run(notch, 416, 3000, overPanel: true);
        Assert.Equal(NotchState.Expanded, notch.State);
        Assert.Null(notch.CollapseAt);
    }

    [Fact]
    public void Leaving_both_windows_collapses_after_the_delay()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overNotch: true);
        Run(notch, 416, 800, overPanel: true);
        notch.Track(Ms(816), false, false, false, false);
        Assert.Equal(Ms(816) + NotchStateMachine.CollapseDelay, notch.CollapseAt);
        Run(notch, 832, 1300);
        Assert.Equal(NotchState.Expanded, notch.State);
        Run(notch, 1316, 1340);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void The_hidden_panel_area_does_not_open_the_notch()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 1000, overPanel: true);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Entering_the_panel_while_it_is_still_closing_reopens_it()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overNotch: true);
        Run(notch, 416, 940); // collapse fires at ~916
        Assert.Equal(NotchState.Collapsed, notch.State);
        Assert.True(notch.Open > 0.2);

        Run(notch, 956, 1000, overPanel: true);
        Assert.Equal(NotchState.Expanded, notch.State);
    }

    [Fact]
    public void An_open_popup_holds_the_panel_open()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overPanel: false, overNotch: true);
        Run(notch, 416, 3000, popupOpen: true);
        Assert.Equal(NotchState.Expanded, notch.State);
        Assert.Null(notch.CollapseAt);

        // Closing the popup with the pointer outside starts the normal delay from that moment.
        notch.Track(Ms(3016), false, false, false, false);
        Assert.Equal(Ms(3016) + NotchStateMachine.CollapseDelay, notch.CollapseAt);
    }

    [Fact]
    public void A_button_pressed_inside_holds_the_panel_open_while_dragging_outside()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overPanel: false, overNotch: true);
        Run(notch, 416, 500, overPanel: true, buttonDown: true); // press inside (e.g. resize border)
        Run(notch, 516, 3000, buttonDown: true);                 // drag outside, still held
        Assert.Equal(NotchState.Expanded, notch.State);

        Run(notch, 3016, 3600);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void A_button_pressed_outside_does_not_hold_the_panel_open()
    {
        var notch = new NotchStateMachine();
        Run(notch, 0, 400, overNotch: true);
        Run(notch, 416, 1200, buttonDown: true); // clicking somewhere else on the desktop
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Pinned_ignores_pointer_exit_and_unpinning_outside_schedules_a_collapse()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.TogglePin(Ms(50));
        Assert.Equal(NotchState.Pinned, notch.State);

        notch.PointerExited(Ms(100));
        notch.Advance(Ms(5000), 0.016);
        Assert.Equal(NotchState.Pinned, notch.State);

        notch.TogglePin(Ms(6000)); // pointer is outside: collapse after the delay
        Assert.Equal(NotchState.Expanded, notch.State);
        notch.Advance(Ms(6500), 0.016);
        Assert.Equal(NotchState.Collapsed, notch.State);
    }

    [Fact]
    public void Pinned_is_not_collapsed_by_tracking()
    {
        var notch = new NotchStateMachine(pinned: true);
        Run(notch, 0, 3000);
        Assert.Equal(NotchState.Pinned, notch.State);
    }

    [Fact]
    public void Unpinning_while_hovering_keeps_the_panel_open()
    {
        var notch = new NotchStateMachine(pinned: true);
        notch.PointerEntered(Ms(0));
        notch.TogglePin(Ms(10));
        notch.Advance(Ms(5000), 0.016);
        Assert.Equal(NotchState.Expanded, notch.State);
    }

    [Fact]
    public void Opening_finishes_within_250_ms_without_overshoot()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        var max = 0.0;
        var t = 0;
        for (; t <= 240; t += 16)
        {
            notch.Advance(Ms(t), 0.016);
            max = Math.Max(max, notch.Open);
        }
        Assert.Equal(1, notch.Open, 6);
        Assert.True(max <= 1);
        Assert.False(notch.IsAnimating);
        Assert.True(NotchStateMachine.OpenDuration < TimeSpan.FromMilliseconds(250));
    }

    [Fact]
    public void Opening_is_eased_out_fast_start_slow_end()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.Advance(Ms(0), NotchStateMachine.OpenDuration.TotalSeconds / 2);
        Assert.True(notch.Progress is > 0.45 and < 0.55);
        Assert.True(notch.Open > 0.8); // ease-out cubic at half time = 0.875
    }

    [Fact]
    public void Closing_plays_the_opening_in_reverse()
    {
        var notch = new NotchStateMachine();
        notch.Force(NotchState.Expanded);
        notch.PointerEntered(Ms(0));
        notch.PointerExited(Ms(0));
        notch.Advance(Ms(500), 0.016);
        Assert.Equal(NotchState.Collapsed, notch.State);
        Assert.True(notch.IsAnimating);
        for (var t = 516; t < 900; t += 16) notch.Advance(Ms(t), 0.016);
        Assert.Equal(0, notch.Open, 6);
        Assert.False(notch.IsAnimating);
    }

    [Fact]
    public void Large_frame_gaps_are_clamped()
    {
        var notch = new NotchStateMachine();
        notch.PointerEntered(Ms(0));
        notch.Advance(Ms(0), double.NaN);
        Assert.Equal(0, notch.Progress, 6);
        notch.Advance(Ms(0), 10);
        Assert.Equal(1, notch.Progress, 6);
    }

    [Fact]
    public void Force_jumps_without_animation()
    {
        var notch = new NotchStateMachine();
        notch.Force(NotchState.Expanded);
        Assert.Equal(1, notch.Open, 6);
        notch.PointerExited(Ms(0));
        Run(notch, 0, 2000);
        Assert.Equal(NotchState.Expanded, notch.State); // a forced state is not collapsed by pointer events it never saw
    }

    [Fact]
    public void Stagger_reveals_entries_one_after_another()
    {
        Assert.Equal(0, NotchStateMachine.Stagger(0, 0), 6);
        Assert.Equal(1, NotchStateMachine.Stagger(1, 3), 6);
        Assert.True(NotchStateMachine.Stagger(0.5, 0) > NotchStateMachine.Stagger(0.5, 3));
    }

    [Theory]
    [InlineData(0, PumpkinMood.Flicker, 0)]
    [InlineData(4.0, PumpkinMood.Wink, 0)]
    [InlineData(6.0, PumpkinMood.Wink, 0.5)]
    [InlineData(-3, PumpkinMood.Flicker, 0)]
    public void Pumpkin_idle_cycle_changes_mood_every_period(double seconds, PumpkinMood mood, double phase)
    {
        var (m, p) = PumpkinIdleCycle.At(seconds);
        Assert.Equal(mood, m);
        Assert.Equal(phase, p, 6);
    }

    [Fact]
    public void Pumpkin_idle_cycle_visits_every_mood_and_wraps()
    {
        var cycle = PumpkinIdleCycle.Period.TotalSeconds * PumpkinIdleCycle.Length;
        var seen = Enumerable.Range(0, PumpkinIdleCycle.Length)
            .Select(i => PumpkinIdleCycle.At(i * PumpkinIdleCycle.Period.TotalSeconds).Mood).ToHashSet();
        Assert.Equal(Enum.GetValues<PumpkinMood>().ToHashSet(), seen);
        Assert.Equal(PumpkinIdleCycle.At(1.5), PumpkinIdleCycle.At(cycle + 1.5));
    }

    [Theory]
    [InlineData("--size=1100x720", 1100, 720)]
    [InlineData("--size=2560X1440", 2560, 1440)]
    public void Launch_size_parses_width_and_height(string arg, double w, double h)
    {
        Assert.Equal((w, h), LaunchArgs.Size([arg]));
    }

    [Theory]
    [InlineData("--size=big")]
    [InlineData("--size=0x720")]
    [InlineData("--other=1x1")]
    public void Launch_size_rejects_bad_values(string arg) => Assert.Null(LaunchArgs.Size([arg]));

    [Theory]
    [InlineData("--notch=collapsed", NotchState.Collapsed)]
    [InlineData("--notch=Expanded", NotchState.Expanded)]
    [InlineData("--notch=pinned", NotchState.Pinned)]
    public void Launch_notch_parses_state(string arg, NotchState state) => Assert.Equal(state, LaunchArgs.Notch([arg]));

    [Fact]
    public void Launch_notch_ignores_unknown_values() => Assert.Null(LaunchArgs.Notch(["--notch=open"]));
}

public class NotchDockTests
{
    private static readonly DockRect Work = new(0, 0, 3440, 1400);

    [Fact]
    public void Tab_is_flush_with_the_left_edge_and_vertically_centered()
    {
        var tab = NotchDock.Tab(new DockRect(100, 40, 1920, 1000));
        Assert.Equal(100, tab.X);
        Assert.Equal(NotchDock.TabWidth, tab.Width);
        Assert.Equal(40 + (1000 - NotchDock.TabHeight) / 2, tab.Y, 6);
    }

    [Fact]
    public void Panel_defaults_to_70_by_80_percent_left_anchored_and_centered()
    {
        var panel = NotchDock.Panel(Work, null, null);
        Assert.Equal(0, panel.X);
        Assert.Equal(3440 * 0.7, panel.Width, 6);
        Assert.Equal(1400 * 0.8, panel.Height, 6);
        Assert.Equal((1400 - panel.Height) / 2, panel.Y, 6);
    }

    [Fact]
    public void Panel_uses_the_remembered_size_clamped_to_the_work_area_and_minimum()
    {
        Assert.Equal(new DockRect(0, 200, 1500, 1000), NotchDock.Panel(Work, 1500, 1000));
        var huge = NotchDock.Panel(Work, 9000, 9000);
        Assert.Equal(Work.Width, huge.Width);
        Assert.Equal(Work.Height, huge.Height);
        var tiny = NotchDock.Panel(Work, 10, 10);
        Assert.Equal(NotchDock.MinPanelWidth, tiny.Width);
        Assert.Equal(NotchDock.MinPanelHeight, tiny.Height);
    }

    [Fact]
    public void Small_screens_cap_the_minimum_to_the_work_area()
    {
        var small = new DockRect(0, 0, 1000, 600);
        var panel = NotchDock.Panel(small, null, null);
        Assert.Equal(1000, panel.Width);
        Assert.Equal(600, panel.Height);
    }

    [Theory]
    [InlineData(0, -2408)]
    [InlineData(0.5, -1204)]
    [InlineData(1, 0)]
    public void Slide_moves_the_panel_out_of_the_left_edge(double open, double x)
    {
        var panel = new DockRect(0, 100, 2408, 1120);
        Assert.Equal(x, NotchDock.SlideX(panel, open), 6);
    }

    [Fact]
    public void Rect_contains_its_inside_points_only()
    {
        var r = new DockRect(10, 10, 20, 20);
        Assert.True(r.Contains(10, 10));
        Assert.True(r.Contains(29.9, 29.9));
        Assert.False(r.Contains(30, 15));
        Assert.False(r.Contains(9, 15));
    }
}
