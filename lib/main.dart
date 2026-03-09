import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dashboard',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D0D14),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF54D4FF),
          secondary: Color(0xFFA78BFA),
          surface: Color(0xFF13131A),
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D0D14),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 24),
              _buildStatCards(),
              const SizedBox(height: 28),
              _buildSectionTitle('Aktivitas Terbaru'),
              const SizedBox(height: 14),
              _buildActivityList(),
              const SizedBox(height: 28),
              _buildSectionTitle('Proyek'),
              const SizedBox(height: 14),
              _buildProjectCards(),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Selamat datang 👋',
              style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.5)),
            ),
            const SizedBox(height: 4),
            const Text(
              'Reza Pratama',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ],
        ),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF54D4FF), Color(0xFFA78BFA)]),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(Icons.person_rounded, color: Colors.white, size: 22),
        ),
      ],
    );
  }

  Widget _buildStatCards() {
    final stats = [
      _StatData('Total Proyek', '12', Icons.folder_rounded, const Color(0xFF54D4FF)),
      _StatData('Selesai', '8', Icons.check_circle_rounded, const Color(0xFF34D399)),
      _StatData('Pending', '4', Icons.schedule_rounded, const Color(0xFFFBBF24)),
      _StatData('Tim', '6', Icons.group_rounded, const Color(0xFFA78BFA)),
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.55,
      children: stats.map((s) => _StatCard(data: s)).toList(),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
    );
  }

  Widget _buildActivityList() {
    final activities = [
      _ActivityData('Design UI selesai', 'Proyek Alpha', '2 jam lalu', Icons.brush_rounded, const Color(0xFF54D4FF)),
      _ActivityData('Bug fix di-push', 'Proyek Beta', '5 jam lalu', Icons.bug_report_rounded, const Color(0xFFF87171)),
      _ActivityData('Meeting tim', 'Proyek Gamma', 'Kemarin', Icons.videocam_rounded, const Color(0xFF34D399)),
    ];
    return Column(children: activities.map((a) => _ActivityTile(data: a)).toList());
  }

  Widget _buildProjectCards() {
    final projects = [
      _ProjectData('Proyek Alpha', 'Mobile App', 0.75, const Color(0xFF54D4FF)),
      _ProjectData('Proyek Beta', 'Web Dashboard', 0.45, const Color(0xFFA78BFA)),
      _ProjectData('Proyek Gamma', 'API Backend', 0.90, const Color(0xFF34D399)),
    ];
    return Column(children: projects.map((p) => _ProjectCard(data: p)).toList());
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF13131A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.07))),
      ),
      child: BottomNavigationBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: const Color(0xFF54D4FF),
        unselectedItemColor: Colors.white30,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.folder_rounded), label: 'Proyek'),
          BottomNavigationBarItem(icon: Icon(Icons.bar_chart_rounded), label: 'Statistik'),
          BottomNavigationBarItem(icon: Icon(Icons.settings_rounded), label: 'Pengaturan'),
        ],
      ),
    );
  }
}

class _StatData {
  final String label, value;
  final IconData icon;
  final Color color;
  const _StatData(this.label, this.value, this.icon, this.color);
}

class _StatCard extends StatelessWidget {
  final _StatData data;
  const _StatCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF13131A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: data.color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(data.icon, color: data.color, size: 18),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(data.value,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
              Text(data.label,
                  style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.45))),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActivityData {
  final String title, subtitle, time;
  final IconData icon;
  final Color color;
  const _ActivityData(this.title, this.subtitle, this.time, this.icon, this.color);
}

class _ActivityTile extends StatelessWidget {
  final _ActivityData data;
  const _ActivityTile({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF13131A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: data.color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(data.icon, color: data.color, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(data.title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 2),
                Text(data.subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.45))),
              ],
            ),
          ),
          Text(data.time,
              style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.3))),
        ],
      ),
    );
  }
}

class _ProjectData {
  final String name, type;
  final double progress;
  final Color color;
  const _ProjectData(this.name, this.type, this.progress, this.color);
}

class _ProjectCard extends StatelessWidget {
  final _ProjectData data;
  const _ProjectCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF13131A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(data.name,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
              Text('${(data.progress * 100).toInt()}%',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: data.color)),
            ],
          ),
          const SizedBox(height: 4),
          Text(data.type,
              style: TextStyle(fontSize: 11, color: Colors.white.withOpacity(0.4))),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: data.progress,
              minHeight: 6,
              backgroundColor: Colors.white.withOpacity(0.08),
              valueColor: AlwaysStoppedAnimation<Color>(data.color),
            ),
          ),
        ],
      ),
    );
  }
}
